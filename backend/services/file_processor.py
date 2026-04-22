import uuid
from pathlib import Path
from PIL import Image
import pdf2image

UPLOAD_DIR = Path("/data/uploads")


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_upload(content: bytes, original_filename: str) -> tuple[str, str]:
    """
    Saves uploaded file and produces a JPEG for Ollama analysis.
    Returns (original_filename_uuid, thumbnail_filename_uuid).
    Both files are in UPLOAD_DIR.
    """
    ensure_upload_dir()
    ext = Path(original_filename).suffix.lower()
    file_id = str(uuid.uuid4())
    original_name = f"{file_id}{ext}"
    saved_path = UPLOAD_DIR / original_name

    with open(saved_path, "wb") as f:
        f.write(content)

    if ext == ".pdf":
        pages = pdf2image.convert_from_path(str(saved_path), dpi=200, first_page=1, last_page=1)
        thumb_name = f"{file_id}_thumb.jpg"
        pages[0].save(str(UPLOAD_DIR / thumb_name), "JPEG")
        return original_name, thumb_name

    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        img = Image.open(saved_path).convert("RGB")
        thumb_name = f"{file_id}_thumb.jpg"
        img.save(str(UPLOAD_DIR / thumb_name), "JPEG")
        return original_name, thumb_name

    # Already a supported image format; use as-is for analysis
    return original_name, original_name
