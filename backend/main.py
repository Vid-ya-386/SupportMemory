import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config, store, memory, llm

app = FastAPI(title="SupportMemory API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"], allow_headers=["*"],
)


# ---------- helpers ----------
def get_customer(cid: str) -> dict:
    c = store.customers.get(cid)
    if not c:
        raise HTTPException(404, f"Customer '{cid}' not found")
    return c


def fail(service: str, e: Exception):
    raise HTTPException(502, f"{service} error: {e}")


# ---------- models ----------
class CustomerIn(BaseModel):
    company: str
    contact: str = ""
    email: str = ""
    plan: str = "Free"
    environment: str = ""


class ChatIn(BaseModel):
    customer_id: str
    message: str
    use_memory: bool = True


class RetainIn(BaseModel):
    customer_id: str
    content: str


class RecallIn(BaseModel):
    customer_id: str
    query: str


class CompareIn(BaseModel):
    customer_id: str
    message: str


# ---------- health ----------
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "hindsight_configured": bool(config.HINDSIGHT_API_KEY),
        "groq_configured": bool(config.GROQ_API_KEY),
        "hindsight_url": config.HINDSIGHT_API_URL,
        "bank_id": config.BANK_ID,
        "model": config.GROQ_MODEL,
    }


# ---------- customers ----------
@app.get("/api/customers")
async def list_customers():
    return [
        {**{k: v for k, v in c.items() if k not in ("messages", "issues")},
         "open_issues": sum(1 for i in c["issues"] if i["status"] == "open"),
         "message_count": len(c["messages"])}
        for c in store.customers.values()
    ]


@app.post("/api/customers")
async def create_customer(body: CustomerIn):
    if not body.company.strip():
        raise HTTPException(400, "Company name is required")
    return store.create_customer(body.company.strip(), body.contact, body.email, body.plan, body.environment)


@app.get("/api/customers/{cid}")
async def customer_detail(cid: str):
    return get_customer(cid)


@app.post("/api/customers/{cid}/issues/{issue_id}/resolve")
async def resolve_issue(cid: str, issue_id: str):
    c = get_customer(cid)
    issue = next((i for i in c["issues"] if i["id"] == issue_id), None)
    if not issue:
        raise HTTPException(404, "Issue not found")
    issue["status"] = "resolved"
    try:
        await memory.retain(
            c,
            f"{c['company']}: the support issue '{issue['title']}' was marked as resolved by the support team "
            f"on {store.now()[:10]}.",
            context="issue resolution",
        )
        store.log("retain", c, f"Stored resolution: {issue['title']}")
    except Exception as e:
        fail("Hindsight", e)
    return issue


# ---------- chat (the core flow) ----------
@app.post("/api/chat")
async def chat(body: ChatIn):
    c = get_customer(body.customer_id)
    message = body.message.strip()
    if not message:
        raise HTTPException(400, "Message is empty")

    # 1. RECALL relevant memories from Hindsight
    retrieved = []
    if body.use_memory:
        try:
            retrieved = await memory.recall(c, message)
            store.log("recall", c, f"Recalled {len(retrieved)} memories for: {message[:70]}")
            retrieved = await llm.explain(message, retrieved)
        except Exception as e:
            fail("Hindsight", e)

    # 2. GENERATE the reply with Groq using memories + current message
    try:
        reply = await llm.support_reply(c, message, retrieved, c["messages"][-6:])
    except Exception as e:
        fail("Groq", e)

    ts = store.now()
    c["messages"].append({"role": "user", "content": message, "ts": ts})
    c["messages"].append({"role": "assistant", "content": reply, "ts": store.now(),
                          "memory_used": body.use_memory, "memory_count": len(retrieved)})
    store.ensure_issue(c, message)

    # 3. RETAIN what happened in Hindsight
    stored, store_error = None, None
    if body.use_memory:
        content = (f"Support conversation with {c['company']} on {ts[:10]}. "
                   f"Customer said: {message} Support agent replied: {reply}")
        try:
            await memory.retain(c, content)
            stored = {"content": content, "tag": memory.tag(c)}
            store.log("retain", c, f"Stored new memory from conversation ({len(content)} chars)")
        except Exception as e:
            store_error = str(e)

    # 4. Return response + memories to the frontend
    return {"reply": reply, "memory_used": body.use_memory, "retrieved": retrieved,
            "stored": stored, "store_error": store_error}


# ---------- Hindsight retain / recall / inspect ----------
@app.post("/api/memory/retain")
async def retain_memory(body: RetainIn):
    c = get_customer(body.customer_id)
    if not body.content.strip():
        raise HTTPException(400, "Content is empty")
    try:
        await memory.retain(c, f"{c['company']}: {body.content.strip()}", context="manual note by support agent")
    except Exception as e:
        fail("Hindsight", e)
    store.log("retain", c, f"Manually stored: {body.content[:70]}")
    return {"stored": True, "content": body.content.strip()}


@app.post("/api/memory/recall")
async def recall_memory(body: RecallIn):
    c = get_customer(body.customer_id)
    try:
        results = await memory.recall(c, body.query)
    except Exception as e:
        fail("Hindsight", e)
    store.log("recall", c, f"Manual recall: {body.query[:70]}")
    return {"results": results}


@app.get("/api/memory/{cid}")
async def inspect_memory(cid: str):
    c = get_customer(cid)
    try:
        return {"results": await memory.inspect(c)}
    except Exception as e:
        fail("Hindsight", e)


# ---------- before / after ----------
@app.post("/api/demo/compare")
async def compare(body: CompareIn):
    c = get_customer(body.customer_id)
    message = body.message.strip()
    try:
        memories = await memory.recall(c, message)
        store.log("recall", c, f"Before/After recall: {message[:70]}")
        memories = await llm.explain(message, memories)
        without, with_mem = await asyncio.gather(
            llm.support_reply(c, message, [], []),
            llm.support_reply(c, message, memories, []),
        )
    except Exception as e:
        fail("Hindsight/Groq", e)
    return {"message": message,
            "without_memory": {"reply": without},
            "with_memory": {"reply": with_mem, "memories": memories}}


# ---------- dashboard ----------
@app.get("/api/dashboard")
async def dashboard():
    recent, open_issues = [], []
    for c in store.customers.values():
        for m in c["messages"]:
            if m["role"] == "user":
                recent.append({"customer_id": c["id"], "company": c["company"],
                               "content": m["content"], "ts": m["ts"]})
        for i in c["issues"]:
            if i["status"] == "open":
                open_issues.append({**i, "customer_id": c["id"], "company": c["company"]})
    recent.sort(key=lambda x: x["ts"], reverse=True)
    return {
        "stats": {
            "customers": len(store.customers),
            "conversations": sum(len(c["messages"]) // 2 for c in store.customers.values()),
            "memory_events": len(store.activity),
            "open_issues": len(open_issues),
        },
        "recent": recent[:6],
        "activity": store.activity[:10],
        "open_issues": open_issues,
    }
