"""Local-disk file storage.

MVP tradeoff: files live on the backend's local filesystem under UPLOAD_DIR.
This keeps local dev and the docker-compose setup simple (no extra cloud
account needed to run the project), at the cost of Render's disk being
ephemeral across deploys. Swapping this for S3 in production is a documented
next step (see README "Known limitations") — the interface below is the
seam that swap would happen behind.
"""

import shutil
import uuid
from pathlib import Path

from app.core.config import settings


def _upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_file(project_id: uuid.UUID, filename: str, content: bytes) -> str:
    """Persist file bytes to disk and return the relative path stored on the Document row."""
    project_dir = _upload_root() / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4()}_{Path(filename).name}"
    destination = project_dir / safe_name
    destination.write_bytes(content)

    return str(destination.relative_to(_upload_root()))


def read_file(relative_path: str) -> bytes:
    return (_upload_root() / relative_path).read_bytes()


def delete_file(relative_path: str) -> None:
    path = _upload_root() / relative_path
    if path.exists():
        path.unlink()


def delete_project_files(project_id: uuid.UUID) -> None:
    """Remove every uploaded file for a project, e.g. when the project itself is deleted."""
    project_dir = _upload_root() / str(project_id)
    if project_dir.exists():
        shutil.rmtree(project_dir)
