import asyncio
from . import config, memory

CUSTOMER = {"id": "selftest", "company": "Self Test Co"}


async def main():
    print("URL :", config.HINDSIGHT_API_URL)
    print("BANK:", config.BANK_ID)
    print("Retaining a test memory...")
    await memory.retain(CUSTOMER, "Self Test Co uses the Enterprise plan and prefers email support.")
    print("Recalling...")
    results = await memory.recall(CUSTOMER, "What plan does Self Test Co use?")
    for r in results:
        print(" -", r["text"])
    print("SUCCESS: Hindsight retain + recall work." if results else
          "Retain worked, but nothing was recalled yet. Wait 10 seconds and run again.")


asyncio.run(main())
