from dataclasses import dataclass, field
from typing import Literal

from python_app.config import TranslationSettings


JobStatus = Literal[
    "idle",
    "preprocessing",
    "chunking",
    "translating",
    "verifying",
    "assembling",
    "completed",
    "failed",
    "cancelled",
]


@dataclass(frozen=True)
class TranslationJob:
    source_text: str
    settings: TranslationSettings


@dataclass(frozen=True)
class JobLog:
    time: str
    message: str


@dataclass
class JobProgress:
    status: JobStatus = "idle"
    current: int = 0
    total: int = 0
    logs: list[JobLog] = field(default_factory=list)


@dataclass(frozen=True)
class TranslationResult:
    source_chunks: list[str]
    translated_chunks: list[str]
    translated_text: str
    progress: JobProgress
