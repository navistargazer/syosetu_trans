import re


def chunk_text(text: str, max_chars: int) -> list[str]:
    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        block = paragraph.strip()
        if not block:
            continue

        if len(block) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            chunks.extend(_split_long_paragraph(block, max_chars))
            continue

        next_block = f"{current}\n\n{block}" if current else block
        if len(next_block) > max_chars and current:
            chunks.append(current.strip())
            current = block
        else:
            current = next_block

    if current.strip():
        chunks.append(current.strip())

    return chunks


def _split_long_paragraph(text: str, max_chars: int) -> list[str]:
    sentences = re.findall(r"[^。！？.!?]+[。！？.!?]?", text) or [text]
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        next_sentence = current + sentence
        if len(next_sentence) > max_chars and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = next_sentence

    if current.strip():
        chunks.append(current.strip())

    return chunks
