import io

import pytest
from pypdf import PdfWriter

from app.services import extraction_service as es


def test_extracts_plain_text():
    assert es.extract_text(b"hello world", "text/plain") == "hello world"


def test_empty_text_file_raises():
    with pytest.raises(es.EmptyDocumentError):
        es.extract_text(b"   ", "text/plain")


def test_unsupported_content_type_raises():
    with pytest.raises(es.UnsupportedFileTypeError):
        es.extract_text(b"data", "application/zip")


def test_supported_content_types_are_pdf_and_txt():
    assert es.SUPPORTED_CONTENT_TYPES == {"application/pdf", "text/plain"}


def _build_pdf_bytes(page_count: int) -> bytes:
    writer = PdfWriter()
    for _ in range(page_count):
        writer.add_blank_page(width=72, height=72)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_pdf_over_page_limit_raises():
    oversized_pdf = _build_pdf_bytes(es.MAX_PDF_PAGES + 1)
    with pytest.raises(es.TooManyPagesError):
        es.extract_text(oversized_pdf, "application/pdf")
