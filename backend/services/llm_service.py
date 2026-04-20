import os
from typing import Generator, Optional
from dotenv import load_dotenv
import ollama

load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
MAX_CONTEXT_CHARS = 4000


def build_messages(
    user_message: str,
    history: list[dict],
    context: str = "",
    citations: list[dict] | None = None,
) -> list[dict]:
    messages = []

    system = "You are Lumi, a helpful AI assistant. Be clear, concise, and accurate."
    if context:
        system += (
            f"\n\nThe user has uploaded document(s). Use this extracted content to answer:\n\n"
            f"---\n{context[:MAX_CONTEXT_CHARS]}\n---\n\n"
            f"When answering from documents, mention the source and page like: "
            f"'According to [filename], page X...'"
        )

    messages.append({"role": "system", "content": system})
    messages.extend(history[-10:])
    messages.append({"role": "user", "content": user_message})
    return messages


def chat(
    user_message: str,
    history: list[dict],
    context: str = "",
    citations: list[dict] | None = None,
) -> str:
    """Non-streaming chat (kept for compatibility)."""
    messages = build_messages(user_message, history, context, citations)
    try:
        response = ollama.chat(model=OLLAMA_MODEL, messages=messages)
        return response["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"LLM error: {str(e)}")


def chat_stream(
    user_message: str,
    history: list[dict],
    context: str = "",
    citations: list[dict] | None = None,
) -> Generator[str, None, None]:
    """Streaming chat — yields text chunks."""
    messages = build_messages(user_message, history, context, citations)
    try:
        stream = ollama.chat(model=OLLAMA_MODEL, messages=messages, stream=True)
        for chunk in stream:
            token = chunk.get("message", {}).get("content", "")
            if token:
                yield token
    except Exception as e:
        yield f"\n\n[Error: {str(e)}]"
        
def generate_quiz_json(context: str, num_questions: int = 5) -> str:
    """Hàm này ép Ollama trả về đúng cấu trúc JSON cho Quiz"""
    prompt = f"""
    Based on the following text, generate {num_questions} multiple-choice questions.
    Return ONLY a JSON array. Each object must have:
    - "question": string
    - "options": list of 4 strings
    - "answer": the correct string from options
    - "explanation": string
    
    Text: {context[:MAX_CONTEXT_CHARS]}
    """
    try:
        # Quan trọng: Thêm format='json' ở đây
        response = ollama.chat(
            model=OLLAMA_MODEL, 
            messages=[{"role": "user", "content": prompt}],
            format='json' 
        )
        return response["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Quiz generation error: {str(e)}")

def generate_flashcards_json(context: str, num_cards: int = 8) -> str:
    """Hàm này ép Ollama trả về đúng cấu trúc JSON cho Flashcards"""
    prompt = f"""
    Based on the following text, generate {num_cards} flashcards.
    Return ONLY a JSON array. Each object must have:
    - "term": a key concept or term
    - "definition": a concise explanation
    
    Text: {context[:MAX_CONTEXT_CHARS]}
    """
    try:
        # Ép định dạng JSON
        response = ollama.chat(
            model=OLLAMA_MODEL, 
            messages=[{"role": "user", "content": prompt}],
            format='json'
        )
        return response["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Flashcard error: {str(e)}")