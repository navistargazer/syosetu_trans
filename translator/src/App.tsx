import { useEffect, useRef, useState } from "react";
import { downloadText } from "./lib/download";
import { defaultSettings, loadSettings, saveSettings, supportedModels } from "./lib/settings";
import { runTranslationJob } from "./orchestrator/runTranslationJob";
import type { JobLog, JobProgress, TranslationResult, TranslationSettings } from "./orchestrator/types";

const sampleText = "ここに翻訳したい小説本文を貼り付けてください。\n\n長い文章は自動で分割して翻訳します。";

export default function App() {
  const [sourceText, setSourceText] = useState(sampleText);
  const [settings, setSettings] = useState<TranslationSettings>(() => loadSettings());
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [progress, setProgress] = useState<JobProgress>({
    status: "idle",
    current: 0,
    total: 0,
    logs: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const isRunning = ["preprocessing", "chunking", "translating", "verifying", "assembling"].includes(
    progress.status,
  );
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  async function startJob() {
    if (!settings.apiKey.trim()) {
      setProgress((current) => ({
        ...current,
        status: "failed",
        logs: appendLog(current.logs, "Gemini API 키를 입력해주세요."),
      }));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setResult(null);
    setProgress({ status: "idle", current: 0, total: 0, logs: [] });

    const jobResult = await runTranslationJob(
      { sourceText, settings },
      {
        signal: controller.signal,
        onUpdate(update) {
          setProgress((current) => ({
            ...current,
            ...update,
            logs: update.logs ? [...current.logs, ...update.logs] : current.logs,
          }));
        },
      },
    );

    if (jobResult) setResult(jobResult);
  }

  function cancelJob() {
    abortRef.current?.abort();
  }

  return (
    <main className="appShell">
      <section className="topBar">
        <div>
          <p className="eyebrow">Local orchestration MVP</p>
          <h1>웹소설 번역 파이프라인</h1>
        </div>
        <div className="actions">
          <button className="secondaryButton" type="button" onClick={() => setSettings(defaultSettings)}>
            설정 초기화
          </button>
          {isRunning ? (
            <button className="dangerButton" type="button" onClick={cancelJob}>
              취소
            </button>
          ) : (
            <button className="primaryButton" type="button" onClick={startJob}>
              번역 실행
            </button>
          )}
        </div>
      </section>

      <section className="workspace">
        <aside className="settingsPane">
          <label>
            <span>Gemini API Key</span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
              placeholder="AIza..."
            />
          </label>

          <label>
            <span>Model</span>
            <select
              value={settings.model}
              onChange={(event) => setSettings({ ...settings, model: event.target.value })}
            >
              {supportedModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Target Language</span>
            <input
              value={settings.targetLanguage}
              onChange={(event) => setSettings({ ...settings, targetLanguage: event.target.value })}
            />
          </label>

          <label>
            <span>Chunk Size</span>
            <input
              type="number"
              min={1000}
              max={12000}
              step={500}
              value={settings.chunkSize}
              onChange={(event) => setSettings({ ...settings, chunkSize: Number(event.target.value) })}
            />
          </label>

          <label>
            <span>System Prompt</span>
            <textarea
              className="promptBox"
              value={settings.systemPrompt}
              onChange={(event) => setSettings({ ...settings, systemPrompt: event.target.value })}
            />
          </label>

          <div className="progressBox">
            <div className="progressHeader">
              <strong>{statusLabel(progress.status)}</strong>
              <span>{percentage}%</span>
            </div>
            <div className="progressTrack">
              <div className="progressFill" style={{ width: `${percentage}%` }} />
            </div>
            <p>
              {progress.current} / {progress.total} chunks
            </p>
          </div>
        </aside>

        <section className="editorGrid">
          <label className="textPanel">
            <span>원문</span>
            <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
          </label>

          <section className="textPanel">
            <div className="panelHeader">
              <span>번역 결과</span>
              <button
                className="secondaryButton compact"
                type="button"
                disabled={!result?.translatedText}
                onClick={() => downloadText("translation.txt", result?.translatedText ?? "")}
              >
                TXT 저장
              </button>
            </div>
            <textarea readOnly value={result?.translatedText ?? ""} placeholder="번역 결과가 여기에 표시됩니다." />
          </section>
        </section>
      </section>

      <section className="logPane">
        <h2>작업 로그</h2>
        <div>
          {progress.logs.length === 0 ? (
            <p className="emptyLog">아직 실행된 작업이 없습니다.</p>
          ) : (
            progress.logs.map((entry, index) => (
              <p key={`${entry.time}-${index}`}>
                <span>{entry.time}</span> {entry.message}
              </p>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function appendLog(logs: JobLog[], message: string) {
  return [...logs, { time: new Date().toLocaleTimeString(), message }];
}

function statusLabel(status: JobProgress["status"]) {
  const labels: Record<JobProgress["status"], string> = {
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
  return labels[status];
}
