from pathlib import Path
import hashlib


CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache" / "translations"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def get_cached_translation(source: str, model: str, target_language: str, context: str = "") -> str | None:
    path = _cache_path(source, model, target_language, context)
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8")


def set_cached_translation(source: str, model: str, target_language: str, translated: str) -> None:
    _cache_path(source, model, target_language, "",).write_text(translated, encoding="utf-8")


def set_cached_translation_with_context(
    source: str,
    model: str,
    target_language: str,
    context: str,
    translated: str,
) -> None:
    _cache_path(source, model, target_language, context).write_text(translated, encoding="utf-8")


def _cache_path(source: str, model: str, target_language: str, context: str) -> Path:
    digest = hashlib.sha256(f"{model}\0{target_language}\0{context}\0{source}".encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.txt"
