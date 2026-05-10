import re


def preprocess_text(text: str) -> str:
    return re.sub(r"\n{4,}", "\n\n\n", text.replace("\r\n", "\n").replace("\r", "\n")).strip()
