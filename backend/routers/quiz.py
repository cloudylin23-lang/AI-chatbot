from fastapi import APIRouter, HTTPException
from models.schemas import QuizRequest, FlashcardRequest, QuizQuestion, Flashcard
from services.context_service import get_file_content
from services.quiz_service import generate_quiz, generate_flashcards

router = APIRouter(prefix="/quiz")


@router.post("/generate", response_model=list[QuizQuestion])
async def gen_quiz(req: QuizRequest):
    content = get_file_content(req.file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found. Please upload first.")
    try:
        questions = generate_quiz(content, req.num_questions)
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@router.post("/flashcards", response_model=list[Flashcard])
async def gen_flashcards(req: FlashcardRequest):
    content = get_file_content(req.file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found. Please upload first.")
    try:
        cards = generate_flashcards(content, req.num_cards)
        return cards
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {str(e)}")