from typing import Optional

# In-memory store: session_id -> list of messages
_sessions: dict[str, list[dict]] = {}

# In-memory store: file_id -> extracted text
_files: dict[str, str] = {}


def get_history(session_id: str) -> list[dict]:
    return _sessions.get(session_id, [])


def add_message(session_id: str, role: str, content: str):
    if session_id not in _sessions:
        _sessions[session_id] = []
    _sessions[session_id].append({"role": role, "content": content})


def clear_session(session_id: str):
    _sessions.pop(session_id, None)


def save_file_content(file_id: str, content: str):
    _files[file_id] = content


def get_file_content(file_id: str) -> Optional[str]:
    return _files.get(file_id)