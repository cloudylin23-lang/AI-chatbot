import json
import re
import ollama
import os

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def _call_llm(prompt: str) -> str:
    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"num_predict": 2048, "temperature": 0.3},
    )
    return response["message"]["content"]


LETTERS = ["A", "B", "C", "D"]


def _extract_json(text: str) -> any:
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        text = match.group(1).strip()

    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return [result]
        return result
    except Exception:
        pass

    for start_char, end_char in [("[", "]"), ("{", "}")]:
        idx = text.find(start_char)
        last_idx = text.rfind(end_char)
        if idx != -1 and last_idx != -1:
            try:
                result = json.loads(text[idx:last_idx + 1])
                if isinstance(result, dict):
                    return [result]
                return result
            except Exception:
                pass

    # JSON bị cắt ngang — recover các object hoàn chỉnh
    items = []
    for m in re.finditer(r'\{[^{}]*\}', text, re.DOTALL):
        try:
            items.append(json.loads(m.group()))
        except Exception:
            pass
    if items:
        return items

    raise ValueError(f"Could not extract JSON. Raw output: {text[:300]}")


def _normalize_options(options: list, answer: str) -> tuple[list[str], str]:
    """
    Normalize options to always have 'A. text' format.
    Handles both ['A. text', ...] and ['text', ...] formats.
    Returns (normalized_options, normalized_answer).
    """
    normalized = []
    for i, opt in enumerate(options[:4]):
        opt_str = str(opt).strip()
        # Already has prefix like "A. " or "A) "
        if len(opt_str) >= 2 and opt_str[0].upper() in LETTERS and opt_str[1] in ".):":
            letter = opt_str[0].upper()
            text = opt_str[2:].strip()
            normalized.append(f"{letter}. {text}")
        else:
            # No prefix — add one based on position
            letter = LETTERS[i] if i < len(LETTERS) else str(i + 1)
            normalized.append(f"{letter}. {opt_str}")

    # Normalize answer to single uppercase letter
    ans = str(answer).strip().upper()
    if len(ans) >= 1 and ans[0] in LETTERS:
        ans = ans[0]
    else:
        ans = "A"

    return normalized, ans


def generate_quiz(content: str, num_questions: int = 5) -> list[dict]:
    """Generate multiple-choice questions from document content."""
    prompt = f"""You are a quiz generator. Generate exactly {num_questions} multiple-choice questions based on the content below.

IMPORTANT: Return ONLY valid JSON array. No explanation, no markdown, no extra text.

Format:
[
  {{
    "question": "Question text?",
    "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
    "answer": "A",
    "explanation": "Why A is correct"
  }}
]

Content:
{content[:3500]}

JSON array ({num_questions} questions):"""

    raw = _call_llm(prompt)

    try:
        questions = _extract_json(raw)
    except Exception as e:
        print(f"[quiz] JSON parse failed: {e}")
        return []

    validated = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        question = q.get("question") or q.get("Question") or q.get("q")
        options  = q.get("options")  or q.get("Options")  or q.get("choices") or []
        answer   = q.get("answer")   or q.get("Answer")   or q.get("correct") or "A"

        if not question or not options or len(options) < 2:
            continue

        norm_opts, norm_ans = _normalize_options(options, str(answer))
        validated.append({
            "question": str(question),
            "options": norm_opts,
            "answer": norm_ans,
            "explanation": str(q.get("explanation") or q.get("Explanation") or ""),
        })

    return validated


def generate_flashcards(content: str, num_cards: int = 8) -> list[dict]:
    """Generate flashcards from document content."""
    prompt = f"""You are a flashcard generator. Generate exactly {num_cards} flashcards for key terms and concepts.

IMPORTANT: Return ONLY valid JSON array. No explanation, no markdown, no extra text.

Format:
[
  {{
    "front": "Term or concept name",
    "back": "Clear definition or explanation",
    "category": "Definition"
  }}
]

Content:
{content[:3500]}

JSON array ({num_cards} flashcards):"""

    raw = _call_llm(prompt)

    try:
        cards = _extract_json(raw)
    except Exception as e:
        print(f"[flashcard] JSON parse failed: {e}")
        return []

    validated = []
    for c in cards:
        if not isinstance(c, dict):
            continue
        front = c.get("front") or c.get("Front") or c.get("term") or c.get("Term")
        back  = c.get("back")  or c.get("Back")  or c.get("definition") or c.get("Definition")

        if not front or not back:
            continue

        validated.append({
            "front": str(front),
            "back": str(back),
            "category": str(c.get("category") or c.get("Category") or "Concept"),
        })

    return validated