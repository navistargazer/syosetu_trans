from python_app.orchestrator.types import TranslationResult


def assemble_result(source_chunks: list[str], translated_chunks: list[str], progress) -> TranslationResult:
    return TranslationResult(
        source_chunks=source_chunks,
        translated_chunks=translated_chunks,
        translated_text="\n\n".join(translated_chunks),
        progress=progress,
    )
