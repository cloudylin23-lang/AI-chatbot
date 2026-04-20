import io
import uuid
import pandas as pd
import PyPDF2
from fastapi import UploadFile, HTTPException


async def parse_file(file: UploadFile) -> tuple[str, str]:
    """
    Returns (file_id, extracted_text).
    Supports PDF, TXT, CSV.
    """
    content = await file.read()
    filename = file.filename or ""
    ext = filename.lower().split(".")[-1]

    try:
        if ext == "pdf":
            text = _parse_pdf(content)
        elif ext == "txt":
            text = content.decode("utf-8", errors="ignore")
        elif ext == "csv":
            text = _parse_csv(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, TXT, or CSV.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")

    file_id = str(uuid.uuid4())
    return file_id, text


def _parse_pdf(content: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def _parse_csv(content: bytes) -> str:
    df = pd.read_csv(io.BytesIO(content))
    return df.to_string(index=False)