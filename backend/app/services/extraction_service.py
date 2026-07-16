"""Plain-text extraction from uploaded files."""

import io

from pypdf import PdfReader

SUPPORTED_CONTENT_TYPES = {"application/pdf", "text/plain"}

# Guards against a pathological PDF (absurd page count) consuming excessive
# CPU/memory in the background ingestion task.
MAX_PDF_PAGES = 500


class UnsupportedFileTypeError(ValueError):
    pass


class EmptyDocumentError(ValueError):
    pass


class TooManyPagesError(ValueError):
    pass


def extract_text(content: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        reader = PdfReader(io.BytesIO(content))
        if len(reader.pages) > MAX_PDF_PAGES:
            raise TooManyPagesError(
                f"PDF has {len(reader.pages)} pages, which exceeds the {MAX_PDF_PAGES}-page limit."
            )
        text = "\n\n".join(page.extract_text() or "" for page in reader.pages)
    elif content_type == "text/plain":
        text = content.decode("utf-8", errors="ignore")
    else:
        raise UnsupportedFileTypeError(f"Unsupported content type: {content_type}")

    text = text.strip()
    if not text:
        raise EmptyDocumentError("No extractable text was found in this document.")
    return text
