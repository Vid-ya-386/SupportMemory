import asyncio
from . import config, llm


async def main():
    print("Model:", config.GROQ_MODEL)
    res = await llm.get_client().chat.completions.create(
        model=config.GROQ_MODEL,
        messages=[{"role": "user", "content": "Reply with the single word: working"}],
        max_tokens=10,
    )
    print("Groq says:", res.choices[0].message.content)


asyncio.run(main())
