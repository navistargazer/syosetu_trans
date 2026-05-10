import type { TranslationSettings } from "../orchestrator/types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function translateWithGemini(
  text: string,
  settings: TranslationSettings,
  signal: AbortSignal,
) {
  const prompt = [
    `Translate the following text into ${settings.targetLanguage}.`,
    "Preserve paragraph breaks, honorifics, names, tone, and formatting.",
    "Do not summarize, omit, add commentary, or wrap the result in markdown fences.",
    "",
    text,
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: settings.systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}
