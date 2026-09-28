"""
Local app data ONLY: customer profiles, the visible chat transcript, tickets,
and an activity log of real Hindsight calls. It does NOT hold any memory.
All memory lives in Hindsight (see memory.py).
"""
import re
import uuid
from datetime import datetime, timezone


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


customers: dict = {}
activity: list = []


def _add(cid, company, contact, email, plan, environment, issues=None):
    customers[cid] = {
        "id": cid, "company": company, "contact": contact, "email": email,
        "plan": plan, "environment": environment, "created_at": now(),
        "messages": [], "issues": issues or [],
    }


def _issue(title):
    return {"id": uuid.uuid4().hex[:8], "title": title, "status": "open", "opened_at": now()}


_add("acme", "Acme Technologies", "Dana Whitfield", "dana@acme-tech.example",
     "Free", "Web app, Chrome on Windows 11")
_add("globex", "Globex Corporation", "Marcus Lee", "marcus@globex.example",
     "Pro", "REST API, Node.js 20 on Linux", [_issue("Export API timing out on large reports")])
_add("initech", "Initech", "Priya Raman", "priya@initech.example",
     "Team", "Web app, Safari on macOS", [_issue("SSO login redirect loop")])


def create_customer(company, contact="", email="", plan="Free", environment=""):
    base = re.sub(r"[^a-z0-9]+", "-", company.lower()).strip("-") or "customer"
    cid = base if base not in customers else f"{base}-{uuid.uuid4().hex[:4]}"
    _add(cid, company, contact, email, plan, environment)
    return customers[cid]


def log(kind, customer, detail):
    activity.insert(0, {"ts": now(), "kind": kind, "customer_id": customer["id"],
                        "company": customer["company"], "detail": detail})
    del activity[60:]


def ensure_issue(customer, message):
    if not any(i["status"] == "open" for i in customer["issues"]):
        customer["issues"].append(_issue(message.strip()[:70]))
