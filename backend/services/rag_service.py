"""
Simple chunk-based RAG service.
Splits file content into chunks, finds relevant chunks for a query,
and returns them with page/chunk citations.
"""
import re
from typing import Optional

CHUNK_SIZE = 800   # chars per chunk
CHUNK_OVERLAP = 80
TOP_K = 4          # number of chunks to retrieve


def _chunk_text(text: str, filename: str) -> list[dict]:
    """Split text into overlapping chunks with source metadata."""
    chunks = []
    start = 0
    idx = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end]
        # Estimate page number (rough: every 3000 chars ≈ 1 page)
        page = (start // 3000) + 1
        chunks.append({
            "id": idx,
            "text": chunk.strip(),
            "source": filename,
            "page": page,
        })
        start += CHUNK_SIZE - CHUNK_OVERLAP
        idx += 1
    return chunks


def _score(chunk_text: str, query: str) -> float:
    """Simple TF-style keyword overlap score (no external deps)."""
    query_words = set(re.findall(r'\w+', query.lower()))
    chunk_words = re.findall(r'\w+', chunk_text.lower())
    if not query_words or not chunk_words:
        return 0.0
    hits = sum(1 for w in chunk_words if w in query_words)
    return hits / (len(chunk_words) ** 0.5)


def retrieve(query: str, file_store: dict[str, dict]) -> tuple[str, list[dict]]:
    """
    Given a query and file_store = {file_id: {filename, content}},
    return (context_string, citations_list).
    """
    all_chunks: list[dict] = []
    for fid, meta in file_store.items():
        chunks = _chunk_text(meta["content"], meta["filename"])
        for c in chunks:
            c["file_id"] = fid
        all_chunks.extend(chunks)

    if not all_chunks:
        return "", []

    scored = sorted(all_chunks, key=lambda c: _score(c["text"], query), reverse=True)
    top = scored[:TOP_K]

    context_parts = []
    citations = []
    seen = set()
    for c in top:
        context_parts.append(f"[Source: {c['source']}, page ~{c['page']}]\n{c['text']}")
        key = (c["source"], c["page"])
        if key not in seen:
            seen.add(key)
            citations.append({"source": c["source"], "page": c["page"]})

    return "\n\n---\n\n".join(context_parts), citations