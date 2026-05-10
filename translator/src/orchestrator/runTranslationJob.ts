import { assembleResult } from "../pipeline/assembleResult";
import { chunkText } from "../pipeline/chunkText";
import { preprocessText } from "../pipeline/preprocessText";
import { verifyTranslation } from "../pipeline/verifyTranslation";
import { translateWithGemini } from "../providers/geminiProvider";
import { getCachedTranslation, setCachedTranslation } from "../cache/translationCache";
import type { JobControls, JobLog, TranslationJob } from "./types";

export async function runTranslationJob(job: TranslationJob, controls: JobControls) {
  const log = (message: string) => {
    const entry: JobLog = {
      time: new Date().toLocaleTimeString(),
      message,
    };
    controls.onUpdate({ logs: [entry] });
  };

  try {
    controls.signal.throwIfAborted();
    controls.onUpdate({ status: "preprocessing", current: 0, total: 0 });
    log("원문을 정리하는 중입니다.");
    const cleaned = preprocessText(job.sourceText);

    controls.signal.throwIfAborted();
    controls.onUpdate({ status: "chunking" });
    const chunks = chunkText(cleaned, job.settings.chunkSize);
    controls.onUpdate({ total: chunks.length });
    log(`${chunks.length}개 청크로 나누었습니다.`);

    const translatedChunks: string[] = [];
    controls.onUpdate({ status: "translating" });

    for (const [index, chunk] of chunks.entries()) {
      controls.signal.throwIfAborted();
      const cached = getCachedTranslation(chunk, job.settings.model, job.settings.targetLanguage);

      if (cached) {
        translatedChunks.push(cached);
        log(`${index + 1}/${chunks.length} 캐시 사용`);
      } else {
        log(`${index + 1}/${chunks.length} 번역 요청`);
        const translated = await translateWithGemini(chunk, job.settings, controls.signal);
        const warnings = verifyTranslation(chunk, translated);

        if (warnings.length > 0) {
          log(`${index + 1}/${chunks.length} 검증 경고: ${warnings.join(" ")}`);
        }

        translatedChunks.push(translated);
        setCachedTranslation(chunk, job.settings.model, job.settings.targetLanguage, translated);
      }

      controls.onUpdate({ current: index + 1 });
    }

    controls.signal.throwIfAborted();
    controls.onUpdate({ status: "assembling" });
    const result = assembleResult(chunks, translatedChunks);
    controls.onUpdate({ status: "completed" });
    log("번역 작업이 완료되었습니다.");
    return result;
  } catch (error) {
    if (controls.signal.aborted) {
      controls.onUpdate({ status: "cancelled" });
      log("작업이 취소되었습니다.");
      return null;
    }

    controls.onUpdate({ status: "failed" });
    log(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    return null;
  }
}
