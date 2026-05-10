import re


def verify_translation(source: str, translated: str) -> list[str]:
    warnings: list[str] = []

    if not translated.strip():
        warnings.append("번역 결과가 비어 있습니다.")

    source_paragraphs = len([part for part in re.split(r"\n{2,}", source) if part.strip()])
    translated_paragraphs = len([part for part in re.split(r"\n{2,}", translated) if part.strip()])

    if source_paragraphs > 1 and translated_paragraphs == 1:
        warnings.append("문단 구분이 크게 줄었습니다.")

    return warnings
