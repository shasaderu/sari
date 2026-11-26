/**
 * Firebase bootstrap — the ONLY place that touches Firebase.
 *
 * All AI inference goes through Firebase AI Logic (`firebase/ai`):
 *  - Hybrid quick summary: getGenerativeModel({ mode: PREFER_ON_DEVICE,
 *    inCloudParams: { model: "gemini-3.8-flash" } })
 *  - Deep analysis: getGenerativeModel({ model: "gemini-3.8-flash" })
 *  - TTS: getGenerativeModel({ model: "gemini-3.8-flash-tts", ... })
 *
 * Model names verified against the official docs on 2026-11-24:
 *  https://firebase.google.com/docs/ai-logic/models
 *  https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
 *  https://firebase.google.com/docs/ai-logic/generate-speech
 *
 * App Check is enforced by Firebase AI Logic (required since 2026-11-02).
 * For local dev / the submission demo, debug mode is used: setting
 * `FIREBASE_APPCHECK_DEBUG_TOKEN = true` before initializeAppCheck makes
 * the SDK mint a debug token (printed in the browser console — safelist it
 * in Firebase console > App Check > Manage debug tokens). A reCAPTCHA
 * Enterprise site key is required for production; see README.
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  CustomProvider,
  ReCaptchaEnterpriseProvider,
  initializeAppCheck,
} from "firebase/app-check";
import {
  GoogleAIBackend,
  InferenceMode,
  ResponseModality,
  SchemaType,
  getAI,
  getGenerativeModel,
  type GenerativeModel,
} from "firebase/ai";
import { config, isConfigured } from "./config";

export const CLOUD_TEXT_MODEL = "gemini-3.8-flash";
export const TTS_MODEL = "gemini-3.8-flash-tts";
export const TTS_VOICE = "Kore";

export type AppCheckState = "debug" | "active" | "off" | "error";

let app: FirebaseApp | null = null;
let ai: ReturnType<typeof getAI> | null = null;
let appCheckState: AppCheckState = "off";
let appCheckError: string | null = null;

export function getAppCheckState(): AppCheckState {
  return appCheckState;
}

export function getAppCheckError(): string | null {
  return appCheckError;
}

/**
 * Initialize Firebase + App Check + AI Logic. Returns false when no valid
 * Firebase config is present (the UI then shows the setup banner).
 */
export function initFirebase(): boolean {
  if (!isConfigured || !config.firebase) return false;
  if (app && ai) return true;

  app = initializeApp(config.firebase);

  // App Check MUST be initialized before the first AI Logic call.
  try {
    if (config.appCheck.debug) {
      // Debug provider: the SDK mints a debug token and prints it to the
      // browser console. Must be set BEFORE initializeAppCheck.
      (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
        true;
    }
    const provider = config.appCheck.recaptchaEnterpriseSiteKey
      ? new ReCaptchaEnterpriseProvider(
          config.appCheck.recaptchaEnterpriseSiteKey,
        )
      : // No production provider yet. In debug mode this provider is never
        // called (the SDK short-circuits to the debug token); if debug is
        // off it throws a clear error instead of failing cryptically.
        new CustomProvider({
          getToken: async () => {
            throw new Error(
              "App Check: no reCAPTCHA Enterprise site key configured. " +
                "Add appCheck.recaptchaEnterpriseSiteKey in firebase-config.local.js " +
                "or enable appCheck.debug for local development.",
            );
          },
        });
    initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
    appCheckState = config.appCheck.debug ? "debug" : "active";
  } catch (err) {
    appCheckState = "error";
    appCheckError = err instanceof Error ? err.message : String(err);
  }

  ai = getAI(app, { backend: new GoogleAIBackend() });
  return true;
}

function requireAI() {
  if (!ai) throw new Error("Firebase AI Logic is not initialized.");
  return ai;
}

/** Hybrid model: Gemini Nano on-device when available, cloud fallback. */
export function getHybridModel(): GenerativeModel {
  return getGenerativeModel(requireAI(), {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: CLOUD_TEXT_MODEL },
  });
}

/** Cloud-only text model (deep analysis, long texts). */
export function getCloudTextModel(): GenerativeModel {
  return getGenerativeModel(requireAI(), { model: CLOUD_TEXT_MODEL });
}

/** Cloud-only model with a JSON schema for deep analysis output. */
export function getDeepAnalysisModel(): GenerativeModel {
  return getGenerativeModel(requireAI(), {
    model: CLOUD_TEXT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          keyPoints: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          actionItems: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          flashcards: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                q: { type: SchemaType.STRING },
                a: { type: SchemaType.STRING },
              },
              required: ["q", "a"],
            },
          },
          quiz: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                q: { type: SchemaType.STRING },
                options: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                answer: { type: SchemaType.INTEGER },
              },
              required: ["q", "options", "answer"],
            },
          },
        },
        required: ["keyPoints", "actionItems", "flashcards", "quiz"],
      },
      maxOutputTokens: 4096,
    },
  });
}

/** TTS model. Language code follows the UI language (id-ID / en-US). */
export function getTtsModel(languageCode: "id-ID" | "en-US"): GenerativeModel {
  return getGenerativeModel(requireAI(), {
    model: TTS_MODEL,
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
        languageCode,
      },
    },
  });
}
