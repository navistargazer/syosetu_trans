import type { TranslationResult } from "../orchestrator/types";

export function assembleResult(sourceChunks: string[], translatedChunks: string[]): TranslationResult {
  return {
    sourceChunks,
    translatedChunks,
    translatedText: translatedChunks.join("\n\n"),
  };
}
