import os
from pathlib import Path
from dotenv import load_dotenv

# Load the .env file that sits in the project root (one folder above /backend)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "")
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "https://api.hindsight.vectorize.io")
BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "supportmemory-demo")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
