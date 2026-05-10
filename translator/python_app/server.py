from dataclasses import asdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import mimetypes

from python_app.config import TranslationSettings
from python_app.orchestrator.run_translation_job import run_translation_job, run_translation_job_events
from python_app.orchestrator.types import TranslationJob
from python_app.pipeline import fetch_url_text


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "web"


class TranslatorHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/":
            path = "/index.html"

        file_path = (PUBLIC / path.lstrip("/")).resolve()
        if PUBLIC not in file_path.parents and file_path != PUBLIC:
            self._send_json({"error": "Forbidden"}, status=403)
            return

        if not file_path.exists() or not file_path.is_file():
            self._send_json({"error": "Not found"}, status=404)
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/api/translate":
            self._handle_translate()
            return
        if self.path == "/api/translate-stream":
            self._handle_translate_stream()
            return
        if self.path == "/api/fetch-url":
            self._handle_fetch_url()
            return
        self._send_json({"error": "Not found"}, status=404)

    def _handle_translate(self):
        try:
            job = self._read_translation_job()
            result = run_translation_job(job)
            self._send_json(asdict(result))
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=400)
        except Exception as exc:
            self._send_json({"error": str(exc)}, status=500)

    def _handle_translate_stream(self):
        try:
            job = self._read_translation_job()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=400)
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        for event in run_translation_job_events(job):
            line = json.dumps(event, ensure_ascii=False).encode("utf-8") + b"\n"
            self.wfile.write(line)
            self.wfile.flush()

    def _handle_fetch_url(self):
        try:
            payload = self._read_json()
            url = str(payload.get("url") or "").strip()
            if not url:
                raise ValueError("URL을 입력해주세요.")
            text = fetch_url_text(url)
            if not text:
                raise ValueError("본문을 찾지 못했습니다.")
            self._send_json({"text": text})
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=400)
        except Exception as exc:
            self._send_json({"error": str(exc)}, status=500)

    def _read_translation_job(self) -> TranslationJob:
        payload = self._read_json()
        settings = TranslationSettings.from_dict(payload.get("settings", {}))
        source_text = str(payload.get("source_text") or payload.get("sourceText") or "")
        if not settings.api_key.strip():
            raise ValueError("Gemini API 키를 입력해주세요.")
        if not source_text.strip():
            raise ValueError("번역할 원문을 입력해주세요.")
        return TranslationJob(source_text=source_text, settings=settings)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def _send_json(self, payload: dict, status: int = 200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(f"[server] {self.address_string()} - {format % args}")


def main():
    host = "127.0.0.1"
    port = 8001
    server = ThreadingHTTPServer((host, port), TranslatorHandler)
    print(f"Python translator app: http://{host}:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
