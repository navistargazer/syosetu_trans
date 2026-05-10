from dataclasses import asdict
from datetime import datetime
from typing import Iterator

from python_app.cache import get_cached_translation, set_cached_translation_with_context
from python_app.orchestrator.types import JobLog, JobProgress, TranslationJob
from python_app.pipeline import assemble_result, chunk_text, preprocess_text, verify_translation
from python_app.providers import translate_with_gemini


def run_translation_job(job: TranslationJob):
    progress = JobProgress()
    chunks, translated_chunks = _run_core(job, progress)
    return assemble_result(chunks, translated_chunks, progress)


def run_translation_job_events(job: TranslationJob) -> Iterator[dict]:
    progress = JobProgress()

    def emit_progress():
        return {"type": "progress", "progress": asdict(progress)}

    try:
        update_progress(progress, status="preprocessing", current=0, total=0)
        add_log(progress, "원문을 정리하는 중입니다.")
        yield emit_progress()
        cleaned = preprocess_text(job.source_text)

        update_progress(progress, status="chunking")
        chunks = chunk_text(cleaned, job.settings.chunk_size)
        update_progress(progress, total=len(chunks))
        add_log(progress, f"{len(chunks)}개 청크로 나누었습니다.")
        yield emit_progress()

        translated_chunks: list[str] = []
        cache_context = job.settings.cache_context()
        update_progress(progress, status="translating")
        yield emit_progress()

        for index, chunk in enumerate(chunks, start=1):
            cached = get_cached_translation(chunk, job.settings.model, job.settings.target_language, cache_context)
            if cached is not None:
                translated = cached
                add_log(progress, f"{index}/{len(chunks)} 캐시 사용")
            else:
                add_log(progress, f"{index}/{len(chunks)} 번역 요청")
                yield emit_progress()
                translated = translate_with_gemini(chunk, job.settings)
                warnings = verify_translation(chunk, translated)
                if warnings:
                    add_log(progress, f"{index}/{len(chunks)} 검증 경고: {' '.join(warnings)}")
                set_cached_translation_with_context(
                    chunk,
                    job.settings.model,
                    job.settings.target_language,
                    cache_context,
                    translated,
                )

            translated_chunks.append(translated)
            update_progress(progress, current=index)
            yield {
                "type": "chunk",
                "index": index,
                "source_chunk": chunk,
                "translated_chunk": translated,
                "progress": asdict(progress),
            }

        update_progress(progress, status="assembling")
        yield emit_progress()
        result = assemble_result(chunks, translated_chunks, progress)
        update_progress(progress, status="completed")
        add_log(progress, "번역 작업이 완료되었습니다.")
        yield {"type": "result", "result": asdict(result)}
    except Exception as exc:
        update_progress(progress, status="failed")
        add_log(progress, str(exc))
        yield {"type": "error", "error": str(exc), "progress": asdict(progress)}


def _run_core(job: TranslationJob, progress: JobProgress):
    update_progress(progress, status="preprocessing", current=0, total=0)
    add_log(progress, "원문을 정리하는 중입니다.")
    cleaned = preprocess_text(job.source_text)

    update_progress(progress, status="chunking")
    chunks = chunk_text(cleaned, job.settings.chunk_size)
    update_progress(progress, total=len(chunks))
    add_log(progress, f"{len(chunks)}개 청크로 나누었습니다.")

    translated_chunks: list[str] = []
    cache_context = job.settings.cache_context()
    update_progress(progress, status="translating")

    for index, chunk in enumerate(chunks, start=1):
        cached = get_cached_translation(chunk, job.settings.model, job.settings.target_language, cache_context)
        if cached is not None:
            translated = cached
            add_log(progress, f"{index}/{len(chunks)} 캐시 사용")
        else:
            add_log(progress, f"{index}/{len(chunks)} 번역 요청")
            translated = translate_with_gemini(chunk, job.settings)
            warnings = verify_translation(chunk, translated)
            if warnings:
                add_log(progress, f"{index}/{len(chunks)} 검증 경고: {' '.join(warnings)}")
            set_cached_translation_with_context(
                chunk,
                job.settings.model,
                job.settings.target_language,
                cache_context,
                translated,
            )

        translated_chunks.append(translated)
        update_progress(progress, current=index)

    update_progress(progress, status="assembling")
    update_progress(progress, status="completed")
    add_log(progress, "번역 작업이 완료되었습니다.")
    return chunks, translated_chunks


def update_progress(progress: JobProgress, status=None, current=None, total=None):
    if status is not None:
        progress.status = status
    if current is not None:
        progress.current = current
    if total is not None:
        progress.total = total


def add_log(progress: JobProgress, message: str):
    progress.logs.append(JobLog(time=datetime.now().strftime("%H:%M:%S"), message=message))
