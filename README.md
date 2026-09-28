# SupportMemory
AI customer-support agent with long-term memory powered by Hindsight (retain + recall) and Groq.
Backend: FastAPI (port 8000). Frontend: React + Vite (port 5173).

## Run (Windows PowerShell)

Terminal 1 (backend), from the SupportMemory folder:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    Copy-Item .env.example .env
    # open .env, paste your keys, save
    python -m backend.test_hindsight
    python -m backend.test_groq
    uvicorn backend.main:app --reload --port 8000

Terminal 2 (frontend):

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173
