"""Groq integration (chat completions via the official `groq` SDK)."""
import json
from groq import AsyncGroq
from . import config

_client = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        if not config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is missing. Add it to your .env file.")
        _client = AsyncGroq(api_key=config.GROQ_API_KEY)
    return _client


BASE_PROMPT = (
    "You are a friendly, professional customer support agent for a SaaS product. "
    "Be concise (under 130 words), concrete, and helpful. Never invent account data."
)

MEMORY_PROMPT = (
    "\n\nYou have long-term memory. The list below contains memories about this customer "
    "recalled from previous conversations. Use them naturally: reference relevant past issues, "
    "steps already tried and the customer's environment. Do NOT ask the customer to repeat "
    "anything already in the memories. If a memory is not relevant, ignore it.\n\nMEMORIES:\n"
)


async def support_reply(customer: dict, message: str, memories: list, history: list) -> str:
    system = BASE_PROMPT + (
        f"\n\nCustomer: {customer['company']} (contact: {customer['contact'] or 'unknown'}, "
        f"plan: {customer['plan']}, environment: {customer['environment'] or 'unknown'})."
    )
    if memories:
        system += MEMORY_PROMPT + "\n".join(f"- {m['text']}" for m in memories)
    messages = [{"role": "system", "content": system}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})
    res = await get_client().chat.completions.create(
        model=config.GROQ_MODEL, messages=messages, temperature=0.4, max_tokens=400)
    return res.choices[0].message.content.strip()


async def explain(message: str, memories: list) -> list:
    """Adds a short 'reason' to each recalled memory explaining why it is relevant."""
    if not memories:
        return memories
    fallback = "Semantically related to the customer's current message."
    try:
        numbered = "\n".join(f"{i}. {m['text']}" for i, m in enumerate(memories))
        res = await get_client().chat.completions.create(
            model=config.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=500,
            messages=[
                {"role": "system", "content":
                    'Return JSON: {"reasons": [..]} with exactly one short sentence (max 18 words) per '
                    "memory explaining why it is relevant to the customer's new message."},
                {"role": "user", "content": f"New message: {message}\n\nMemories:\n{numbered}"},
            ],
        )
        reasons = json.loads(res.choices[0].message.content).get("reasons", [])
    except Exception:
        reasons = []
    for i, m in enumerate(memories):
        m["reason"] = reasons[i] if i < len(reasons) and isinstance(reasons[i], str) else fallback
    return memories
