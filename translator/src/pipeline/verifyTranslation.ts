export function verifyTranslation(source: string, translated: string) {
  const warnings: string[] = [];

  if (!translated.trim()) {
    warnings.push("번역 결과가 비어 있습니다.");
  }

  const sourceParagraphs = source.split(/\n{2,}/).filter(Boolean).length;
  const translatedParagraphs = translated.split(/\n{2,}/).filter(Boolean).length;

  if (sourceParagraphs > 1 && translatedParagraphs === 1) {
    warnings.push("문단 구분이 크게 줄었습니다.");
  }

  return warnings;
}
