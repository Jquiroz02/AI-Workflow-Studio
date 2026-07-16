"""Token-aware recursive text chunking for embedding.

Splits on paragraph boundaries first (keeps semantically related sentences
together), falls back to a hard token split for any single paragraph that's
still too large, and carries a small token overlap between consecutive
chunks so context isn't lost at chunk boundaries.
"""

import tiktoken

_ENCODING = tiktoken.get_encoding("cl100k_base")

DEFAULT_CHUNK_TOKENS = 800
DEFAULT_OVERLAP_TOKENS = 100


def count_tokens(text: str) -> int:
    return len(_ENCODING.encode(text))


def chunk_text(
    text: str,
    chunk_tokens: int = DEFAULT_CHUNK_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buffer: list[int] = []

    def flush(next_seed: list[int] | None = None) -> None:
        nonlocal buffer
        if buffer:
            decoded = _ENCODING.decode(buffer).strip()
            if decoded:
                chunks.append(decoded)
        buffer = list(next_seed) if next_seed else []

    for paragraph in paragraphs:
        para_tokens = _ENCODING.encode(paragraph)

        if len(para_tokens) > chunk_tokens:
            flush()
            step = max(chunk_tokens - overlap_tokens, 1)
            for i in range(0, len(para_tokens), step):
                sub = para_tokens[i : i + chunk_tokens]
                decoded = _ENCODING.decode(sub).strip()
                if decoded:
                    chunks.append(decoded)
            continue

        if buffer and len(buffer) + len(para_tokens) > chunk_tokens:
            seed = buffer[-overlap_tokens:] if overlap_tokens else []
            flush(next_seed=seed)

        buffer.extend(para_tokens)

    flush()
    return chunks
