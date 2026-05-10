const defaultSettings = {
  api_key: "",
  model: "gemini-3-flash-preview",
  target_language: "Korean",
  chunk_size: 6000,
  system_prompt:
    "You are a professional Japanese web novel translator. Translate into natural Korean while preserving paragraph breaks, speaker tone, honorific nuance, names, and formatting.",
  translation_note: "",
  glossary: "",
  theme: "light",
  view_mode: "interleaved",
};

const settingsKey = "python-novel-translator:settings";
const sampleText = "ここに翻訳したい小説本文を貼り付けてください。\n\n長い文章は自動で分割して翻訳します。";

const elements = {
  apiKey: document.querySelector("#apiKey"),
  sourceUrl: document.querySelector("#sourceUrl"),
  model: document.querySelector("#model"),
  targetLanguage: document.querySelector("#targetLanguage"),
  chunkSize: document.querySelector("#chunkSize"),
  systemPrompt: document.querySelector("#systemPrompt"),
  translationNote: document.querySelector("#translationNote"),
  glossary: document.querySelector("#glossary"),
  sourceText: document.querySelector("#sourceText"),
  translationReader: document.querySelector("#translationReader"),
  translateButton: document.querySelector("#translateButton"),
  fetchUrlButton: document.querySelector("#fetchUrlButton"),
  resetButton: document.querySelector("#resetButton"),
  themeButton: document.querySelector("#themeButton"),
  interleavedButton: document.querySelector("#interleavedButton"),
  parallelButton: document.querySelector("#parallelButton"),
  downloadButton: document.querySelector("#downloadButton"),
  statusLabel: document.querySelector("#statusLabel"),
  percentage: document.querySelector("#percentage"),
  progressFill: document.querySelector("#progressFill"),
  currentChunk: document.querySelector("#currentChunk"),
  totalChunks: document.querySelector("#totalChunks"),
  logs: document.querySelector("#logs"),
};

const statusLabels = {
  idle: "대기",
  preprocessing: "전처리",
  chunking: "분할",
  translating: "번역",
  verifying: "검증",
  assembling: "조립",
  completed: "완료",
  failed: "실패",
  cancelled: "취소됨",
};

let translatedText = "";
let renderedSourceChunks = [];
let renderedTranslatedChunks = [];
let viewMode = "interleaved";

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(settingsKey) || "{}") };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings) {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

function readSettings() {
  return {
    api_key: elements.apiKey.value,
    model: "gemini-3-flash-preview",
    target_language: elements.targetLanguage.value,
    chunk_size: Number(elements.chunkSize.value || 6000),
    system_prompt: elements.systemPrompt.value,
    translation_note: elements.translationNote.value,
    glossary: elements.glossary.value,
    theme: document.documentElement.dataset.theme || "light",
    view_mode: viewMode,
  };
}

function fillSettings(settings) {
  elements.apiKey.value = settings.api_key || "";
  elements.model.value = "gemini-3-flash-preview";
  elements.targetLanguage.value = settings.target_language || "Korean";
  elements.chunkSize.value = settings.chunk_size || 6000;
  elements.systemPrompt.value = settings.system_prompt || defaultSettings.system_prompt;
  elements.translationNote.value = settings.translation_note || "";
  elements.glossary.value = settings.glossary || "";
  setTheme(settings.theme || "light");
  setViewMode(settings.view_mode || "interleaved");
}

function setProgress(progress) {
  const total = progress.total || 0;
  const current = progress.current || 0;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  elements.statusLabel.textContent = statusLabels[progress.status] || progress.status || "대기";
  elements.percentage.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
  elements.currentChunk.textContent = String(current);
  elements.totalChunks.textContent = String(total);
}

function setLogs(logs) {
  elements.logs.innerHTML = "";
  if (!logs || logs.length === 0) {
    elements.logs.innerHTML = '<p class="emptyLog">아직 실행된 작업이 없습니다.</p>';
    return;
  }

  for (const entry of logs) {
    const row = document.createElement("p");
    const time = document.createElement("span");
    time.textContent = entry.time;
    row.append(time, ` ${entry.message}`);
    elements.logs.appendChild(row);
  }
}

function renderReader(sourceChunks, translatedChunks) {
  renderedSourceChunks = sourceChunks || [];
  renderedTranslatedChunks = translatedChunks || [];
  elements.translationReader.innerHTML = "";
  elements.translationReader.classList.toggle("parallel", viewMode === "parallel");
  elements.translationReader.classList.toggle("interleaved", viewMode === "interleaved");

  if (renderedTranslatedChunks.length === 0) {
    elements.translationReader.innerHTML = '<p class="readerEmpty">번역 결과가 여기에 한 줄씩 표시됩니다.</p>';
    return;
  }

  renderedSourceChunks.forEach((sourceChunk, chunkIndex) => {
    const translatedChunk = renderedTranslatedChunks[chunkIndex] || "";
    const sourceLines = splitReaderLines(sourceChunk);
    const translatedLines = splitReaderLines(translatedChunk);
    const maxLines = Math.max(sourceLines.length, translatedLines.length);
    const chunk = document.createElement("article");
    chunk.className = "readerChunk";

    for (let index = 0; index < maxLines; index += 1) {
      const pair = document.createElement("div");
      pair.className = "readerPair";

      const source = document.createElement("p");
      source.className = "sourceLine";
      source.textContent = sourceLines[index] || "";

      const translated = document.createElement("p");
      translated.className = "translatedLine";
      translated.textContent = translatedLines[index] || "";

      pair.append(source, translated);
      chunk.appendChild(pair);
    }

    elements.translationReader.appendChild(chunk);
  });
}

function splitReaderLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function runTranslation() {
  const settings = readSettings();
  saveSettings(settings);
  translatedText = "";
  renderReader([], []);
  elements.downloadButton.disabled = true;
  elements.translateButton.disabled = true;
  setProgress({ status: "translating", current: 0, total: 0 });
  setLogs([{ time: new Date().toLocaleTimeString(), message: "서버에 번역 작업을 요청했습니다." }]);

  try {
    const response = await fetch("/api/translate-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_text: elements.sourceText.value, settings }),
    });

    if (!response.ok || !response.body) {
      const data = await response.json();
      throw new Error(data.error || "번역에 실패했습니다.");
    }

    await readEventStream(response.body);
  } catch (error) {
    setProgress({ status: "failed", current: 0, total: 0 });
    setLogs([{ time: new Date().toLocaleTimeString(), message: error.message }]);
  } finally {
    elements.translateButton.disabled = false;
  }
}

async function readEventStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      handleStreamEvent(JSON.parse(line));
    }

    if (done) break;
  }

  if (buffer.trim()) handleStreamEvent(JSON.parse(buffer));
}

function handleStreamEvent(event) {
  if (event.progress) {
    setProgress(event.progress);
    setLogs(event.progress.logs);
  }

  if (event.type === "chunk") {
    renderedSourceChunks[event.index - 1] = event.source_chunk;
    renderedTranslatedChunks[event.index - 1] = event.translated_chunk;
    translatedText = renderedTranslatedChunks.filter(Boolean).join("\n\n");
    elements.downloadButton.disabled = !translatedText;
    renderReader(renderedSourceChunks, renderedTranslatedChunks);
  }

  if (event.type === "result") {
    translatedText = event.result.translated_text;
    renderReader(event.result.source_chunks, event.result.translated_chunks);
    setProgress(event.result.progress);
    setLogs(event.result.progress.logs);
    elements.downloadButton.disabled = !translatedText;
  }

  if (event.type === "error") {
    throw new Error(event.error || "번역에 실패했습니다.");
  }
}

async function fetchUrlText() {
  const url = elements.sourceUrl.value.trim();
  if (!url) return;
  elements.fetchUrlButton.disabled = true;
  setLogs([{ time: new Date().toLocaleTimeString(), message: "URL 본문을 가져오는 중입니다." }]);

  try {
    const response = await fetch("/api/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "URL 본문을 가져오지 못했습니다.");
    elements.sourceText.value = data.text;
    setLogs([{ time: new Date().toLocaleTimeString(), message: "URL 본문을 원문 입력창에 넣었습니다." }]);
  } catch (error) {
    setLogs([{ time: new Date().toLocaleTimeString(), message: error.message }]);
  } finally {
    elements.fetchUrlButton.disabled = false;
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeButton.textContent = theme === "dark" ? "라이트" : "다크";
}

function setViewMode(mode) {
  viewMode = mode;
  elements.interleavedButton.classList.toggle("active", mode === "interleaved");
  elements.parallelButton.classList.toggle("active", mode === "parallel");
  renderReader(renderedSourceChunks, renderedTranslatedChunks);
}

function downloadResult() {
  const blob = new Blob([translatedText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "translation.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

fillSettings(loadSettings());
elements.sourceText.value = sampleText;
elements.translateButton.addEventListener("click", runTranslation);
elements.fetchUrlButton.addEventListener("click", fetchUrlText);
elements.downloadButton.addEventListener("click", downloadResult);
elements.themeButton.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  saveSettings(readSettings());
});
elements.interleavedButton.addEventListener("click", () => {
  setViewMode("interleaved");
  saveSettings(readSettings());
});
elements.parallelButton.addEventListener("click", () => {
  setViewMode("parallel");
  saveSettings(readSettings());
});
elements.resetButton.addEventListener("click", () => {
  fillSettings(defaultSettings);
  saveSettings(defaultSettings);
});
