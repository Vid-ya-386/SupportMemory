"""
Hindsight integration. Every function here makes a real call to Hindsight Cloud.
Each customer's memories are isolated with a tag: customer:<id>
"""
import asyncio
from hindsight_client import Hindsight
from . import config

_client = None


def get_client() -> Hindsight:
    global _client
    if _client is None:
        if not config.HINDSIGHT_API_KEY:
            raise RuntimeError("HINDSIGHT_API_KEY is missing. Add it to your .env file.")
        _client = Hindsight(
            base_url=config.HINDSIGHT_API_URL,
            api_key=config.HINDSIGHT_API_KEY,
            timeout=60.0,
        )
    return _client


async def _call(name: str, **kwargs):
    """Use the SDK's async method (a<name>) when present, else run the sync one in a thread."""
    client = get_client()
    fn = getattr(client, "a" + name, None)
    if fn is not None:
        return await fn(**kwargs)
    return await asyncio.to_thread(getattr(client, name), **kwargs)


def tag(customer: dict) -> str:
    return f"customer:{customer['id']}"


async def retain(customer: dict, content: str, context: str = "customer support conversation"):
    """Store information in Hindsight long-term memory."""
    kwargs = dict(bank_id=config.BANK_ID, content=content, context=context)
    try:
        return await _call("retain", tags=[tag(customer)], **kwargs)
    except TypeError:  # older SDK without tags support
        return await _call("retain", **kwargs)


def _to_dict(r) -> dict:
    return {
        "id": str(getattr(r, "id", "") or ""),
        "text": getattr(r, "text", str(r)),
        "type": str(getattr(r, "type", "") or "memory"),
        "context": getattr(r, "context", None),
    }


async def recall(customer: dict, query: str, limit: int = 8) -> list:
    """Retrieve memories relevant to `query` from Hindsight."""
    q = f"{customer['company']}: {query}"
    kwargs = dict(bank_id=config.BANK_ID, query=q)
    try:
        res = await _call("recall", tags=[tag(customer)], tags_match="any_strict", **kwargs)
    except TypeError:
        res = await _call("recall", **kwargs)
    return [_to_dict(r) for r in res.results[:limit]]


INSPECT_QUERY = "all previous problems, troubleshooting steps, solutions, environment details and preferences"


async def inspect(customer: dict, limit: int = 20) -> list:
    return await recall(customer, INSPECT_QUERY, limit)
