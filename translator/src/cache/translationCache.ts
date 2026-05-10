const CACHE_PREFIX = "novel-translator:cache:";

export function getCachedTranslation(source: string, model: string, targetLanguage: string) {
  return localStorage.getItem(cacheKey(source, model, targetLanguage));
}

export function setCachedTranslation(
  source: string,
  model: string,
  targetLanguage: string,
  translated: string,
) {
  localStorage.setItem(cacheKey(source, model, targetLanguage), translated);
}

function cacheKey(source: string, model: string, targetLanguage: string) {
  return `${CACHE_PREFIX}${model}:${targetLanguage}:${simpleHash(source)}`;
}

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
