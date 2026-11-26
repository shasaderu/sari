/**
 * All AI calls. Every call goes through Firebase AI Logic — no direct
 * Gemini/OpenAI/REST calls anywhere in this app.
 */

import {
  getCloudTextModel,
  getDeepAnalysisModel,
  getHybridModel,
  getTtsModel,
} from "./firebase";
import { routeSummary, type NanoStatus } from "./router";
import { parseQuick } from "./parse";
import type { Lang } from "./i18n";

export { parseQuick } from "./parse";

export type EngineSource = "on-device" | "cloud";

export interface QuickResult {
  title: string;
  summary: string;
  source: EngineSource;
  /** Why the cloud ran, when it did (shown honestly in the UI). */
  fallback: "none" | "cloud-fallback" | "cloud-long" | "cloud-nano-missing";
}

export interface DeepResult {
  keyPoints: string[];
  actionItems: string[];
  flashcards: { q: string; a: string }[];
  quiz: { q: string; options: string[]; answer: number }[];
}

export interface TtsResult {
  wavBase64: string;
  mimeType: string;
  trimmed: boolean;
}

/** Max chars sent to TTS (model input limit is 8,192 tokens). */
export const TTS_MAX_CHARS = 4000;

declare global {
  interface Window {
    LanguageModel?: {
      availability: () => Promise<string>;
      create?: (options?: unknown) => Promise<unknown>;
    };
  }
}

/**
 * Probe the Chrome Prompt API (Gemini Nano) availability.
 * Returns 'unsupported' when the browser has no LanguageModel API at all
 * (Firefox, Safari, mobile Chrome, old Chrome, ...).
 */
export async function probeNano(): Promise<NanoStatus> {
  try {
    const LM = window.LanguageModel;
    if (!LM || typeof LM.availability !== "function") return "unsupported";
    const raw = (await LM.availability()) as string;
    switch (raw) {
      case "available":
      case "readily":
        return "available";
      case "downloading":
        return "downloading";
      case "downloadable":
      case "after-download":
        return "downloadable";
      default:
        return "unavailable";
    }
  } catch {
    return "unavailable";
  }
}

function quickPrompt(text: string, lang: Lang): string {
  if (lang === "id") {
    return (
      "Kamu adalah Sari, peringkas catatan. Ringkas teks berikut dalam Bahasa Indonesia.\n" +
      "Balas HANYA dengan format berikut, tanpa teks lain:\n" +
      "JUDUL: <judul singkat, maks 8 kata>\n" +
      "RINGKASAN: <ringkasan 2-4 kalimat, padat, tanpa poin-poin>\n\n" +
      "TEKS:\n\"\"\"" +
      text +
      "\"\"\""
    );
  }
  return (
    "You are Sari, a note summarizer. Summarize the following text in English.\n" +
    "Reply ONLY in this format, with no other text:\n" +
    "TITLE: <short title, max 8 words>\n" +
    "SUMMARY: <2-4 sentence dense summary, no bullet points>\n\n" +
    "TEXT:\n\"\"\"" +
    text +
    "\"\"\""
  );
}

function normalizeSource(value: unknown): EngineSource {
  const v = String(value ?? "").toLowerCase();
  return v === "on_device" || v === "on-device" ? "on-device" : "cloud";
}

export interface QuickOptions {
  nano: NanoStatus;
  onProgress?: (message: string) => void;
}

/**
 * Quick summary: on-device first (Gemini Nano), cloud fallback.
 * `initializeDeviceModel` MUST run on the user's click (user-activation
 * requirement) and BEFORE generateContent — main.ts calls this from the
 * button handler, so that requirement is satisfied.
 */
export async function summarizeQuick(
  text: string,
  lang: Lang,
  opts: QuickOptions,
): Promise<QuickResult> {
  const route = routeSummary({
    chars: text.length,
    online: navigator.onLine,
    nano: opts.nano,
    privacyOnly: false,
  });

  if (route.engine === "hybrid") {
    const model = getHybridModel();
    try {
      // Triggers the Nano download on first use (progress shown in UI).
      // Fire-and-forget for PREFER_ON_DEVICE: generateContent below will
      // wait for / fall back as needed.
      void model.initializeDeviceModel((p: number) => {
        opts.onProgress?.(`download:${Math.round(p * 100)}`);
      });
    } catch {
      // On-device init failing must not block the cloud fallback.
    }
    const result = await model.generateContent(quickPrompt(text, lang));
    const source = normalizeSource(result.response.inferenceSource);
    const parsed = parseQuick(result.response.text(), lang);
    return {
      ...parsed,
      source,
      fallback:
        source === "cloud"
          ? "cloud-fallback"
          : "none",
    };
  }

  // Long text (or Nano known-absent): straight to cloud, said plainly.
  const model = getCloudTextModel();
  const result = await model.generateContent(quickPrompt(text, lang));
  const parsed = parseQuick(result.response.text(), lang);
  return {
    ...parsed,
    source: "cloud",
    fallback:
      route.reason === "cloud-long" ? "cloud-long" : "cloud-nano-missing",
  };
}

/** Deep analysis: always cloud (reasoning + structured JSON output). */
export async function analyzeDeep(text: string, lang: Lang): Promise<DeepResult> {
  const model = getDeepAnalysisModel();
  const prompt =
    lang === "id"
      ? "Analisis teks berikut dalam Bahasa Indonesia. Kembalikan 5-8 poin kunci, 3-6 action item, 4-6 flashcard (pertanyaan + jawaban singkat), dan 3-4 soal kuis pilihan ganda (4 opsi, indeks jawaban benar 0-3).\n\nTEKS:\n\"\"\"" +
        text +
        "\"\"\""
      : "Analyze the following text in English. Return 5-8 key points, 3-6 action items, 4-6 flashcards (question + short answer), and 3-4 multiple-choice quiz questions (4 options, correct answer index 0-3).\n\nTEXT:\n\"\"\"" +
        text +
        "\"\"\"";
  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text()) as Partial<DeepResult>;
  return {
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    flashcards: Array.isArray(parsed.flashcards)
      ? parsed.flashcards.filter((f) => f && f.q && f.a)
      : [],
    quiz: Array.isArray(parsed.quiz)
      ? parsed.quiz.filter(
          (q) =>
            q &&
            q.q &&
            Array.isArray(q.options) &&
            q.options.length >= 2 &&
            typeof q.answer === "number",
        )
      : [],
  };
}

/** TTS: read the summary aloud via Gemini TTS (cloud, billed). */
export async function synthesizeSpeech(
  text: string,
  lang: Lang,
): Promise<TtsResult> {
  const trimmed = text.length > TTS_MAX_CHARS;
  const speakText = trimmed ? text.slice(0, TTS_MAX_CHARS) : text;
  const model = getTtsModel(lang === "id" ? "id-ID" : "en-US");
  const style =
    lang === "id"
      ? "Warm and clear, like a friendly teacher reading notes aloud."
      : "Warm and clear, like a friendly teacher reading notes aloud.";
  const result = await model.generateContent([
    {
      type: "text",
      text: speakText,
      speechMetadata: { style },
    },
  ]);
  const parts = result.response.inlineDataParts();
  const first = parts?.[0];
  if (!first?.inlineData?.data) {
    throw new Error("TTS returned no audio data.");
  }
  return {
    wavBase64: first.inlineData.data,
    mimeType: first.inlineData.mimeType || "audio/wav",
    trimmed,
  };
}

/** Map raw SDK errors to short, honest, user-facing messages. */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID|permission/i.test(msg)) {
    return "Firebase config tidak valid — periksa apiKey di firebase-config.local.js.";
  }
  if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return "Kuota Gemini habis / rate limit — coba lagi nanti atau cek kuota di Firebase console.";
  }
  if (/App Check|app-check|403/i.test(msg)) {
    return "App Check menolak permintaan — pastikan debug token sudah di-safelist di Firebase console (lihat README).";
  }
  if (/fetch|network|Failed to fetch|offline/i.test(msg)) {
    return "Tidak bisa menghubungi cloud — periksa koneksi internetmu.";
  }
  if (/on-device|not available|QuotaExceeded/i.test(msg)) {
    return "Model on-device tidak bisa dipakai untuk teks ini — coba Analisis Mendalam (cloud).";
  }
  return msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
}
