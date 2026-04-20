# ⚡ Lumi — AI Chatbot with File Processing & Quiz Generation

> Full-stack AI chatbot · React + TypeScript · FastAPI · Ollama · SQLite

---

## ✨ Features

### Core
| Feature | Details |
|---|---|
| **Streaming Chat** | Words appear token-by-token via SSE (fetch + ReadableStream) |
| **File Upload** | PDF (PyPDF2), TXT, CSV (pandas) — up to 10 MB |
| **Multi-file Support** | Upload multiple files, all included in RAG context |
| **RAG + Citations** | Chunk-based retrieval, AI cites "filename, page ~X" |
| **Conversation History** | Last 10 turns in context, all messages persisted to SQLite |
| **Stop Generation** | AbortController cancels in-flight stream instantly |
| **Feedback System** | 👍/👎 per AI message, stored to DB for future fine-tuning |
| **Markdown Rendering** | Code blocks with syntax highlighting + Copy button |

### Bonus
| Feature | Details |
|---|---|
| **Quiz Generation** | MCQ questions with explanations generated from uploaded docs |
| **Flashcard Generation** | Term/definition cards with flip animation and category tags |
| **Document Preview** | Left panel shows actual file content when in Quiz mode |
| **SQLite Persistence** | Sessions, messages, feedback, files all stored in `lumi.db` |
| **Dark / Light Mode** | System preference detection + manual toggle |
| **Glassmorphism UI** | 3D bot, gradient blobs, grid overlay, glow sweep line |
| **Docker Setup** | One-command deployment with docker-compose |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js ≥ 18 and npm ≥ 9
- Python ≥ 3.10
- [Ollama](https://ollama.com) installed

### Option A — Local development (recommended)

**Step 1 — Start Ollama**
```bash
ollama pull llama3.2
ollama serve
```

**Step 2 — Backend**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux

uvicorn main:app --reload --port 8000
```

Verify: http://localhost:8000/health → `{"status":"ok","version":"2.0.0"}`

**Step 3 — Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

---

### Option B — Docker (one command)

```bash
docker-compose up --build
```

Services:
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- Ollama → http://localhost:11434

> **Note:** First run downloads the llama3.2 model (~2 GB). Wait ~2 minutes for Ollama to be ready before using the app.
---

### Environment Variables

File: `backend/.env`

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
MAX_FILE_SIZE_MB=10
DB_PATH=lumi.db
```

---

## 🗂️ Project Structure

```
AI-chatbot/
├── docker-compose.yml
├── backend/
│   ├── main.py                   # FastAPI app, mounts all routers
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── routers/
│   │   ├── chat.py               # SSE streaming + feedback endpoints
│   │   ├── upload.py             # Single/multi upload + preview
│   │   ├── quiz.py               # Quiz & flashcard generation
│   │   └── history.py            # Session persistence
│   ├── services/
│   │   ├── llm_service.py        # Ollama streaming wrapper
│   │   ├── rag_service.py        # Chunk-based RAG + citations
│   │   ├── quiz_service.py       # LLM quiz/flashcard generator
│   │   ├── file_service.py       # PDF / TXT / CSV parser
│   │   ├── context_service.py    # In-memory session context
│   │   └── db_service.py         # SQLite persistence layer
│   └── models/
│       └── schemas.py            # Pydantic request/response models
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── App.tsx               # Root layout, theme, navigation
    │   ├── index.css             # Design system (Tailwind + @layer)
    │   ├── quiz.css              # Quiz page styles
    │   ├── components/
    │   │   ├── ChatWindow.tsx
    │   │   ├── MessageBubble.tsx # Markdown, code, feedback buttons
    │   │   ├── MessageInput.tsx  # Pill input, multi-file attach
    │   │   ├── LoadingIndicator.tsx
    │   │   └── QuizPage.tsx      # Quiz + flashcard UI + doc preview
    │   ├── hooks/
    │   │   ├── useChat.ts        # Streaming, stop, feedback
    │   │   └── useQuiz.ts        # Quiz/flashcard state
    │   ├── services/api.ts       # All HTTP calls
    │   └── types/index.ts        # Shared TypeScript interfaces
    ├── tailwind.config.js
    ├── vite.config.ts
    └── package.json
```

---

## 🏗️ Architecture Decisions & Trade-offs

### Why FastAPI?
Native `async` support is essential for SSE streaming — each token from Ollama is forwarded to the client immediately without buffering. Flask would require `gevent` or threads to achieve the same. FastAPI also generates OpenAPI docs at `/docs` automatically, which sped up testing.

### Why Ollama over HuggingFace?
Ollama runs models locally with zero API keys, no rate limits, and no data privacy concerns. The trade-off is that it requires ~2 GB disk space and a reasonably modern CPU/GPU. HuggingFace Transformers would be more flexible for model selection but adds significant setup complexity.

### Streaming via fetch, not EventSource
The browser's `EventSource` API only supports GET requests. Since the chat payload (message, session_id, file_ids) needs to be sent as a POST body, the frontend uses `fetch()` with `ReadableStream` and an `AbortController` instead. This keeps the implementation dependency-free while fully supporting the stop-generation feature.

### RAG without a vector database
For the scope of this assignment, a keyword-overlap TF scorer over 800-char chunks is sufficient. It requires zero extra infrastructure (no Chroma, no FAISS, no sentence-transformer model). The trade-off is lower recall precision compared to semantic embeddings — a file about "neural nets" won't match a query about "deep learning" unless those exact words appear. Acceptable for a demo, but would need embedding-based retrieval in production.

### SQLite for persistence
A single-file database requires no Docker, no server, and no configuration. It handles the expected single-user demo load with ease. The trade-off is that it doesn't support concurrent writes well — for a multi-user production deployment, PostgreSQL with SQLAlchemy would be the right swap.

### In-memory context + SQLite dual storage
Session messages are stored both in-memory (for fast context lookup during a session) and in SQLite (for persistence across restarts). The trade-off is memory usage grows with active sessions, but this is negligible at demo scale.

### Tailwind `@layer components` for CSS
Custom classes like `.bubble-box`, `.glass-container` are defined inside Tailwind's `@layer components` directive. This lets us write semantic class names in JSX while still getting Tailwind's purging and dark-mode utilities — best of both worlds compared to pure CSS modules or pure utility classes.

---

## 🔮 What I Would Improve With More Time

### Technical
- **Vector RAG** — Replace keyword scoring with `sentence-transformers` + FAISS for semantic search. This would dramatically improve retrieval quality, especially for domain-specific documents.
- **Streaming quiz generation** — Currently the quiz blocks until the full JSON is generated. SSE streaming of quiz items would feel much faster.
- **Authentication** — Add user accounts so multiple people can have separate conversation histories.
- **PostgreSQL** — Replace SQLite with Postgres + SQLAlchemy for production-grade concurrent access.
- **Tests** — Add pytest for backend service layer (especially `rag_service`, `quiz_service`) and Vitest + React Testing Library for frontend components.
- **Observability** — Integrate structured logging (structlog) and OpenTelemetry traces to measure LLM latency, RAG retrieval quality, and error rates.
- **CSV/Excel analysis** — Integrate a Pandas agent so the LLM can write and execute Python to answer analytical questions about tabular data (e.g. "what's the average of column X?") and return charts.

### UX
- **Conversation sidebar** — Load and switch between past conversations from the SQLite history.
- **PDF viewer** — Embed a PDF.js viewer in the document preview panel instead of raw text.
- **Export formats** — Export quiz as Moodle XML or Quizlet CSV, not just JSON.
- **Mobile layout** — The current sidebar collapses on mobile but the input area needs more work for small screens.
- **Typing indicators** — Show "AI is thinking..." with estimated wait time based on model latency.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/stream` | SSE streaming chat |
| `POST` | `/chat` | Non-streaming chat fallback |
| `POST` | `/feedback` | Submit 👍/👎 for a message |
| `POST` | `/upload` | Upload single file |
| `POST` | `/upload/multiple` | Upload multiple files |
| `GET` | `/upload/{id}/preview` | Get file content preview |
| `POST` | `/quiz/generate` | Generate MCQ questions |
| `POST` | `/quiz/flashcards` | Generate flashcards |
| `GET` | `/history/sessions` | List all sessions |
| `GET` | `/history/sessions/{id}/messages` | Get session messages |
| `DELETE` | `/history/sessions/{id}` | Delete session |
| `GET` | `/health` | Health check |

Interactive docs: http://localhost:8000/docs

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, custom @layer components |
| Backend | FastAPI, Python 3.11, Uvicorn |
| LLM | Ollama (llama3.2) |
| File parsing | PyPDF2, pandas |
| Database | SQLite (via db_service) |
| Deployment | Docker, docker-compose, Nginx |
