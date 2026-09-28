# SupportMemory
An AI customer-support agent that remembers customer history and previous troubleshooting outcomes using **Hindsight long-term memory**.
SupportMemory helps support teams avoid repetitive conversations by recalling relevant customer context before generating a response.
## Problem
Customer-support agents often have to reconstruct a customer's history from previous conversations.
This can lead to:
* Repeated questions
* Repeated troubleshooting steps
* Lost context between support interactions
* Generic responses that ignore previous attempts
## Solution
SupportMemory combines an AI support agent with Hindsight memory.
When a customer interacts with the system:
1. The agent recalls relevant memories from Hindsight.
2. The retrieved memories are provided to the language model.
3. The agent generates a context-aware response.
4. The new interaction is retained in Hindsight for future conversations.
This creates a continuous customer-support memory rather than treating every conversation as a completely new interaction.
## Key Features
* AI-powered customer support chat
* Long-term customer memory with Hindsight
* Semantic memory recall
* Automatic memory retention after conversations
* Memory relevance explanations
* Customer profiles and support history
* Support issue tracking
* Memory inspection and manual memory retention
* Before/after comparison of responses with and without memory
* Dashboard showing customers, conversations, memory activity and open issues
## Hindsight Memory Flow
```text
Customer Message
|
v
Hindsight RECALL
|
v
Relevant Customer Memories
|
v
Groq LLM
|
v
Context-Aware Support Response
|
v
Hindsight RETAIN
|
v
Future Conversations
```
The important part of the system is the memory loop:
**RECALL → reason with context → respond → RETAIN**
## Example
A customer previously reported:
> Stripe payment failed while upgrading to the Pro plan.
The customer also tried a different card and was using Chrome on Windows 11.
Later, the customer can simply say:
> My payment is failing again.
Instead of treating this as an isolated request, SupportMemory can retrieve the previous payment issue, card attempt and environment information from Hindsight.
The interface also displays the retrieved memories and explains why they are relevant to the current message.
## Before vs After Memory
### Without Memory
The agent starts with no previous customer context and may ask the customer to explain the problem again.
### With Hindsight Memory
The agent can retrieve previous issues, troubleshooting attempts and environment information before generating its response.
This demonstrates how long-term memory changes the support experience rather than simply adding a memory feature to a chatbot.
## Architecture
<img width="893" height="521" alt="image" src="https://github.com/user-attachments/assets/6b89f295-a86c-41c9-88a9-2b92131ef8cc" />

## Technology Stack
### Frontend
* React
* Vite
* JavaScript
* CSS
### Backend
* Python
* FastAPI
* Uvicorn
### AI and Memory
* Hindsight by Vectorize
* Groq API
* hindsight-client
### Development
* Git
* GitHub
* Python virtual environment
* npm
## Project Structure
```text
SupportMemory/
│
├── backend/
│ ├── config.py
│ ├── llm.py
│ ├── main.py
│ ├── memory.py
│ ├── store.py
│ ├── test_groq.py
│ └── test_hindsight.py
│
├── frontend/
│ ├── src/
│ ├── index.html
│ ├── package.json
│ └── vite.config.js
│
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt
```
## Local Setup
### 1. Clone the repository
```bash
git clone https://github.com/Vid-ya-386/SupportMemory.git
cd SupportMemory
```
### 2. Create and activate the Python environment
Windows PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
### 3. Install backend dependencies
```powershell
pip install -r requirements.txt
```
### 4. Configure environment variables
Create .env from .env.example:
```powershell
Copy-Item .env.example .env
```
Then add your own:
```env
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID=supportmemory-demo
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```
Never commit the .env file or expose API keys publicly.
### 5. Test Hindsight
```powershell
python -m backend.test_hindsight
```
### 6. Test Groq
```powershell
python -m backend.test_groq
```
### 7. Start the backend
```powershell
uvicorn backend.main:app --reload --port 8000
```
The backend runs at:
```text
http://127.0.0.1:8000
```
### 8. Start the frontend
Open another terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open:
```text
http://localhost:5173
```
## Environment Variables
| Variable | Purpose |
| ------------------- | ----------------------------------------- |
| HINDSIGHT\_API\_KEY | Hindsight authentication |
| HINDSIGHT\_API\_URL | Hindsight API endpoint |
| HINDSIGHT\_BANK\_ID | Memory bank used by SupportMemory |
| GROQ\_API\_KEY | Groq authentication |
| GROQ\_MODEL | Language model used for support responses |
## Why Hindsight Matters
The central capability of SupportMemory is not simply generating AI responses.
The system uses Hindsight as persistent customer memory so that information from previous support interactions can become useful context in future interactions.
This enables the agent to remember:
* Previous problems
* Troubleshooting steps
* Solutions
* Customer environment
* Previous failed attempts
* Issue resolutions
The memory is surfaced to the support agent at the moment it is relevant.
## Demo Flow
A typical demonstration follows this sequence:
1. Open a customer profile.
2. Show existing customer memories.
3. Start a support conversation.
4. Hindsight recalls relevant memories.
5. The AI uses those memories to generate a response.
6. The new interaction is retained.
7. Start a later conversation with less context.
8. Show that Hindsight can retrieve the previous information.
## Future Improvements
* Persistent application database
* Authentication and role-based access
* Integration with real ticketing systems
* More advanced support analytics
* Automatic issue resolution tracking
* Human-agent escalation workflows
* Customer sentiment and priority detection
* Production deployment
## License
This project is provided for demonstration and development purposes.
