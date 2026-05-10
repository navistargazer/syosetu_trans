from urllib import error, parse, request
import json

from python_app.config import TranslationSettings


def translate_with_gemini(text: str, settings: TranslationSettings) -> str:
    instructions = [
        f"Translate the following text into {settings.target_language}.",
        "Preserve paragraph breaks, honorifics, names, tone, and formatting.",
        "Do not summarize, omit, add commentary, or wrap the result in markdown fences.",
    ]
    if settings.translation_note.strip():
        instructions.extend(["", "Translation note:", settings.translation_note.strip()])
    if settings.glossary.strip():
        instructions.extend(["", "Glossary and name dictionary:", settings.glossary.strip()])

    prompt = "\n".join([*instructions, "", "Text to translate:", text])
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{parse.quote(settings.model)}:generateContent?key={parse.quote(settings.api_key)}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": settings.system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
    }
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, method="POST", headers={"Content-Type": "application/json"})

    try:
        with request.urlopen(req, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(detail) from exc

    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    return "".join(part.get("text", "") for part in parts)
