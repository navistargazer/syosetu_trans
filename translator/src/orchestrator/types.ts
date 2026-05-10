export type JobStatus =
  | "idle"
  | "preprocessing"
  | "chunking"
  | "translating"
  | "verifying"
  | "assembling"
  | "completed"
  | "failed"
  | "cancelled";

export type TranslationSettings = {
  apiKey: string;
  model: string;
  targetLanguage: string;
  systemPrompt: string;
  chunkSize: number;
};

export type TranslationJob = {
  sourceText: string;
  settings: TranslationSettings;
};

export type JobLog = {
  time: string;
  message: string;
};

export type JobProgress = {
  status: JobStatus;
  current: number;
  total: number;
  logs: JobLog[];
};

export type TranslationResult = {
  sourceChunks: string[];
  translatedChunks: string[];
  translatedText: string;
};

export type JobUpdate = Partial<JobProgress>;

export type JobControls = {
  signal: AbortSignal;
  onUpdate: (update: JobUpdate) => void;
};
