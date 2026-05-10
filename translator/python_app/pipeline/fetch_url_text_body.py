from html.parser import HTMLParser
from urllib import request
import re


class NovelBodyParser(HTMLParser):
    target_class = "p-novel__body"
    void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.in_body = False
        self.body_depth = 0
        self.skip_depth = 0
        self.found_body = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = set((attrs_dict.get("class") or "").split())

        if not self.in_body and tag == "div" and self.target_class in classes:
            self.in_body = True
            self.found_body = True
            self.body_depth = 1
            self.parts.append("\n")
            return

        if not self.in_body:
            return

        if tag in self.void_tags:
            if tag == "br":
                self.parts.append("\n")
            return

        self.body_depth += 1
        if tag in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1
        if tag in {"p", "div", "section", "article", "h1", "h2", "h3", "li"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if not self.in_body:
            return
        
        if tag in self.void_tags:
            return

        if tag in {"script", "style", "noscript", "svg"} and self.skip_depth > 0:
            self.skip_depth -= 1
        if tag in {"p", "div", "section", "article", "li"}:
            self.parts.append("\n")

        self.body_depth -= 1
        if self.body_depth <= 0:
            self.in_body = False

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
