import uuid
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest, ChatResponse, FeedbackRequest
from services.context_service import get_history, add_message, get_file_content
from services.llm_service import chat_stream
from services.rag_service import retrieve
from services.db_service import save_message, save_feedback

router = APIRouter()

# In-memory file store: file_id -> {filename, content}
_file_store: dict[str, dict] = {}


def register_file(file_id: str, filename: str, content: str):
    """Called from upload router to register file content for RAG."""
    _file_store[file_id] = {"filename": filename, "content": content}


@router.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """SSE streaming endpoint."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    history = get_history(req.session_id)

    # Build RAG context from uploaded files
    context = ""
    citations: list[dict] = []
    if req.file_ids:
        active_store = {fid: _file_store[fid] for fid in req.file_ids if fid in _file_store}
        if active_store:
            context, citations = retrieve(req.message, active_store)

    # Save user message
    user_msg_id = str(uuid.uuid4())
    save_message(user_msg_id, req.session_id, "user", req.message)
    add_message(req.session_id, "user", req.message)

    async def event_generator():
        full_reply = ""
        try:
            for token in chat_stream(req.message, history, context, citations):
                full_reply += token
                data = json.dumps({"token": token})
                yield f"data: {data}\n\n"

            # Send citations at end
            if citations:
                cit_data = json.dumps({"citations": citations})
                yield f"data: {cit_data}\n\n"

            # Done signal
            yield f"data: {json.dumps({'done': True})}\n\n"

        finally:
            # Save AI reply to DB and in-memory history
            ai_msg_id = str(uuid.uuid4())
            save_message(ai_msg_id, req.session_id, "assistant", full_reply)
            add_message(req.session_id, "assistant", full_reply)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """Non-streaming fallback."""
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    history = get_history(req.session_id)
    context = ""
    citations: list[dict] = []
    if req.file_ids:
        active_store = {fid: _file_store[fid] for fid in req.file_ids if fid in _file_store}
        if active_store:
            context, citations = retrieve(req.message, active_store)

    tokens = []
    for token in chat_stream(req.message, history, context, citations):
        tokens.append(token)
    reply = "".join(tokens)

    user_msg_id = str(uuid.uuid4())
    ai_msg_id = str(uuid.uuid4())
    save_message(user_msg_id, req.session_id, "user", req.message)
    save_message(ai_msg_id, req.session_id, "assistant", reply)
    add_message(req.session_id, "user", req.message)
    add_message(req.session_id, "assistant", reply)

    return ChatResponse(message=reply, session_id=req.session_id, citations=citations)


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    save_feedback(req.message_id, req.session_id, req.rating)
    return {"status": "ok"}