import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from models.schemas import UploadResponse
from services.file_service import parse_file
from services.context_service import save_file_content
from services.db_service import save_file_to_db
from routers.chat import register_file

router = APIRouter()

MAX_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", 10)) * 1024 * 1024


async def _process_one(file: UploadFile, session_id: str = "") -> UploadResponse:
    import io
    content_bytes = await file.read()
    if len(content_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Max 10MB.")

    file.file = io.BytesIO(content_bytes)
    file_id, text = await parse_file(file)

    # Store in memory (for RAG) and DB
    save_file_content(file_id, text)
    register_file(file_id, file.filename or "unknown", text)
    if session_id:
        save_file_to_db(file_id, session_id, file.filename or "unknown", text, len(content_bytes))

    return UploadResponse(
        file_id=file_id,
        filename=file.filename or "unknown",
        size=len(content_bytes),
        message="Uploaded successfully.",
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_single(file: UploadFile = File(...), session_id: str = ""):
    return await _process_one(file, session_id)


@router.post("/upload/multiple", response_model=List[UploadResponse])
async def upload_multiple(files: List[UploadFile] = File(...), session_id: str = ""):
    results = []
    for f in files:
        results.append(await _process_one(f, session_id))
    return results


@router.get("/upload/{file_id}/preview")
async def preview_file(file_id: str, max_chars: int = 3000):
    from services.context_service import get_file_content
    content = get_file_content(file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found.")
    return {
        "file_id": file_id,
        "content": content[:max_chars],
        "truncated": len(content) > max_chars,
        "total_chars": len(content),
    }