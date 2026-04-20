from fastapi import APIRouter
from services.db_service import get_sessions, get_messages, delete_session

router = APIRouter(prefix="/history")


@router.get("/sessions")
async def list_sessions():
    return get_sessions()


@router.get("/sessions/{session_id}/messages")
async def list_messages(session_id: str):
    return get_messages(session_id)


@router.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    delete_session(session_id)
    return {"status": "deleted"}