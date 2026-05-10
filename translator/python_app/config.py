from dataclasses import dataclass


SUPPORTED_MODELS = ("gemini-3-flash-preview",)


@dataclass(frozen=True)
class TranslationSettings:
    api_key: str
    model: str = "gemini-3-flash-preview"
    target_language: str = "Korean"
    chunk_size: int = 6000
    translation_note: str = ""
    glossary: str = ""
    system_prompt: str = (
        "You are a professional Japanese web novel translator. Translate into natural Korean "
        "while preserving paragraph breaks, speaker tone, honorific nuance, names, and formatting."
    )

    @classmethod
    def from_dict(cls, data: dict) -> "TranslationSettings":
        model = str(data.get("model") or cls.model)
        if model not in SUPPORTED_MODELS:
            model = cls.model

        return cls(
            api_key=str(data.get("api_key") or data.get("apiKey") or ""),
            model=model,
            target_language=str(data.get("target_language") or data.get("targetLanguage") or cls.target_language),
            chunk_size=int(data.get("chunk_size") or data.get("chunkSize") or cls.chunk_size),
            translation_note=str(data.get("translation_note") or data.get("translationNote") or ""),
            glossary=str(data.get("glossary") or ""),
            system_prompt=str(data.get("system_prompt") or data.get("systemPrompt") or cls.system_prompt),
        )

    def cache_context(self) -> str:
        return "\n".join([self.system_prompt, self.translation_note, self.glossary])
