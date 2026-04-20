from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    session_id: str
    file_ids: list[str] = []   # multi-file support

class ChatResponse(BaseModel):
    message: str
    session_id: str
    citations: list[dict] = []

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    message: str

class FeedbackRequest(BaseModel):
    message_id: str
    session_id: str
    rating: int   # 1 = like, -1 = dislike

class QuizRequest(BaseModel):
    file_id: str
    num_questions: int = 5

class FlashcardRequest(BaseModel):
    file_id: str
    num_cards: int = 8

class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str

class Flashcard(BaseModel):
    front: str
    back: str
    category: str

class SessionInfo(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str