from html.parser import HTMLParser
from urllib import request
import re


class NovelBodyParser(HTMLParser):
    target_class = "p-novel__body"

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.in_body = False
        self.found_body = False
        self.skip_depth = 0
        # 단순히 숫자가 아니라, 본문 div의 깊이를 저장합니다.
        self.body_container_depth = 0
        self.current_depth = 0

    def handle_starttag(self, tag, attrs):
        self.current_depth += 1
        attrs_dict = dict(attrs)
        classes = set((attrs_dict.get("class") or "").split())

        # 본문 시작 지점 포착
        if not self.in_body and tag == "div" and self.target_class in classes:
            self.in_body = True
            self.found_body = True
            self.body_container_depth = self.current_depth
            return

        if not self.in_body:
            return

        if tag in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1
        
        # 줄바꿈 처리
        if tag in {"p", "br", "div", "li"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if self.in_body:
            # 본문 시작 태그(div)가 닫히는 깊이인지 확인
            if self.current_depth == self.body_container_depth:
                self.in_body = False
            
            if tag in {"script", "style", "noscript", "svg"} and self.skip_depth > 0:
                self.skip_depth -= 1

        self.current_depth -= 1

    def handle_data(self, data):
        if self.in_body and self.skip_depth == 0:
            cleaned = data.strip()
            if cleaned:
                self.parts.append(cleaned)

    def text(self) -> str:
        text = "\n".join(self.parts)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n[ \t]+", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


def fetch_url_text(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        raise ValueError("http:// 또는 https:// URL만 지원합니다.")

    req = request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Local Novel Translator)",
            "Accept": "text/html,application/xhtml+xml,text/plain",
        },
    )
    with request.urlopen(req, timeout=30) as response:
        content_type = response.headers.get("Content-Type", "")
        raw = response.read()

    charset = "utf-8"
    match = re.search(r"charset=([\w-]+)", content_type, re.IGNORECASE)
    if match:
        charset = match.group(1)

    body = raw.decode(charset, errors="replace")
    if "text/plain" in content_type:
        return body.strip()

    parser = NovelBodyParser()
    parser.feed(body)
    if not parser.found_body:
        raise ValueError('본문 영역 div.p-novel__body를 찾지 못했습니다.')

    text = parser.text()
    if not text:
        raise ValueError("본문 영역은 찾았지만 텍스트가 비어 있습니다.")
    return text
