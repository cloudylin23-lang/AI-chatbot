import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import chat, upload, quiz

load_dotenv()

app = FastAPI(
    title="AI Chatbot API",
    version="1.0.0",
    description="Backend for AI chatbot with file processing",
)

# CORS — cho phép frontend React gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(quiz.router)

@app.get("/health")
def health():
    return {"status": "ok"}