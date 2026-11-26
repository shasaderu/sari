# 🌸 Sari — Peringkas Catatan Hybrid

> **#BuildHybridAI 2026 · Web track · Devpost ($30k)**
> Paste a text → instant summary on your device, deep analysis in the cloud,
> read aloud with Gemini TTS. Every AI call goes through **Firebase AI Logic**
> — no direct Gemini/OpenAI/REST calls anywhere.

**Demo:** paste an article, lecture notes, or a chat → **⚡ Ringkas Cepat**
(instant summary + auto title) → **🔍 Analisis Mendalam** (key points,
action items, flashcards, quiz) → **🔊 Bacakan** (Gemini TTS voice).

Every result carries a badge — **On-device (Nano)** or **Cloud (Gemini)** —
plus a plain-language note explaining *why* that engine ran. No silent
fallback: if Nano is missing, the UI says so before and after the call.

---

## ✨ Features

| Feature | Engine | Notes |
| --- | --- | --- |
| Quick summary + auto title | Gemini Nano first, cloud fallback | `PREFER_ON_DEVICE` hybrid model |
| Deep analysis: key points, action items | Cloud — Gemini 3.8 Flash | Structured JSON output (`responseSchema`) |
| Flashcards (flip) + MCQ quiz | Cloud — Gemini 3.8 Flash | Same deep-analysis call |
| Read summary aloud | Cloud — Gemini 3.8 Flash TTS (voice `Kore`) | WAV 24 kHz, in-browser playback |
| History | localStorage (50 entries) | Click to reload, delete per item |
| ID / EN UI toggle | — | AI answers in the UI language |
| Transparent engine status | — | Nano / Firebase / App Check / network chips |

## 🧠 Why hybrid — the split

| | On-device (Gemini Nano) | Cloud (Gemini 3.8 Flash) |
| --- | --- | --- |
| Used for | Quick summary of short texts | Long texts, deep analysis, TTS |
| Privacy | Text never leaves the device | Text is sent to Google |
| Cost / quota | Free, no quota | Uses Firebase AI Logic quota (Sprint 2) |
| Needs | Chrome Desktop 139+, Nano downloaded | Internet |
| Output | Plain text | Structured JSON, audio |

A **deterministic router** (`src/router.ts`, unit-tested) decides *before*
any AI call — the SDK fallback alone is not enough:

- **Short text (≤ ~6.000 chars), Nano ready, online** → `PREFER_ON_DEVICE`
  (Nano first, cloud fallback inside the SDK).
- **Long text** → `ONLY_IN_CLOUD`. Nano throws `QuotaExceededError` on
  oversized input, which `PREFER_ON_DEVICE` does not always catch.
- **Offline** → `ONLY_ON_DEVICE`. The cloud is unreachable by definition.
- **Nano known-absent** (Firefox/Safari/mobile/old Chrome) → `ONLY_IN_CLOUD`
  directly, so the user is not surprised by a slow silent fallback.

`initializeDeviceModel()` is called on the user's button click (Chrome's
user-activation requirement) with live download progress on the button.

## 🔥 How Firebase AI Logic is used

SDK: `firebase@13.4.0` (`@firebase/ai@3.1.0`). All names verified against
the official docs on 2026-11-24 (see links at the bottom).

```ts
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

const ai = getAI(app, { backend: new GoogleAIBackend() });

// 1. Hybrid quick summary — Nano on-device, cloud fallback
const hybrid = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: "gemini-3.8-flash" },
});
await hybrid.initializeDeviceModel((p) => showProgress(p)); // on user click
const res = await hybrid.generateContent(prompt);
res.response.inferenceSource; // "ON_DEVICE" | "IN_CLOUD" -> the badge
res.response.text();

// 2. Deep analysis — cloud only, structured JSON
const deep = getGenerativeModel(ai, {
  model: "gemini-3.8-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: { /* keyPoints, actionItems, flashcards, quiz */ },
  },
});

// 3. TTS — cloud only
import { ResponseModality } from "firebase/ai";
const tts = getGenerativeModel(ai, {
  model: "gemini-3.8-flash-tts",
  generationConfig: {
    responseModalities: [ResponseModality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      languageCode: "id-ID", // or "en-US"
    },
  },
});
const audio = await tts.generateContent([{ type: "text", text, speechMetadata: { style } }]);
const wavBase64 = audio.response.inlineDataParts()[0].inlineData.data; // WAV, decode + play
```

**App Check** (required by Firebase AI Logic): `initializeAppCheck` runs
before the first AI call. Local dev / demo uses the debug provider —
`self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` is set before init, the SDK
prints a debug token in the browser console. Production needs a reCAPTCHA
Enterprise site key (see Setup).

## 🚀 Setup

### 1. Install

```bash
npm install
```

### 2. Create the Firebase project (console — do this once)

1. [Firebase console](https://console.firebase.google.com) → create a project
   (no Analytics needed).
2. **AI Services → AI Logic → Get started** → choose **Gemini Developer API**
   (free tier; billing is only needed for the TTS quota in Sprint 2).
3. Register a **Web app** (`</>`) and copy its config.
4. **App Check**: the AI Logic setup enforces it automatically. For local
   dev, copy the **debug token** printed in the browser console on first run
   and safelist it in **Security → App Check → Apps → Manage debug tokens**.

### 3. Fill in the config (local only — never committed)

```bash
cp src/firebase-config.example.js src/firebase-config.local.js
# edit src/firebase-config.local.js with your Web app config
```

`src/firebase-config.local.js` is gitignored. The app boots without it but
shows a setup banner and disables the AI buttons.

### 4. Run

```bash
npm run dev      # http://127.0.0.1:5173
npm run build    # tsc + vite build -> dist/
npm test         # 9 unit tests (router + parser), no network
npm run preview  # serve the production build on :4173
```

### 5. Enable Gemini Nano (for the on-device demo)

On the demo machine, use **Chrome Desktop 139+** and enable
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart
Chrome, then in DevTools console run `await LanguageModel.create()` once to
pre-download the model. The status chip in Sari shows whether Nano is
`available / downloading / unavailable`.

## 🧪 Test status (2026-11-24)

| Check | Result |
| --- | --- |
| `npm test` (router + parser) | ✅ 9/9 pass |
| `npm run build` (tsc + vite) | ✅ clean, no warnings |
| Headless Chrome 159 render | ✅ banner, chips, disabled buttons, no JS errors |
| Nano availability probe (this VM) | ⚠️ **unavailable** — Chrome in this VM has on-device AI disabled (console: *"enable On-device AI in chrome://settings/ai"*); flags did not change it. The fallback path is implemented per docs, but **on-device inference itself is untested here** — test on a real Chrome with Nano downloaded. |
| Cloud (summary / deep / TTS) | ⏳ **untested** — needs a real Firebase config (project not created yet by design). Test with the checklist below once configured. |

**Manual test checklist (after config):**

1. Open the app → chips: Firebase ✓, App Check debug, Nano status.
2. Click a sample → **Ringkasan Cepat** → badge says **On-device (Nano)**
   on a Nano-ready Chrome, or **Cloud (Gemini)** + the fallback note
   otherwise. Check the summary + title render.
3. **Analisis Mendalam** → key points, action items, flashcards flip, quiz
   right/wrong feedback.
4. **Bacakan Ringkasan** → audio plays (Gemini TTS, billed quota).
5. Toggle **EN** → whole UI + AI answers switch to English.
6. Reload → history entry appears; click it to reload the result.

## 🌐 Deploy (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: dist ; SPA: yes
npm run build
firebase deploy --only hosting
```

(`firebase.json` / `.firebaserc` are intentionally not committed — the
deploy target belongs to the Firebase project owner.)

## 📁 Structure

```
sari/
├── index.html                 # App shell
├── src/
│   ├── main.ts                # UI wiring (no AI calls)
│   ├── firebase.ts            # Firebase init, App Check, model factories
│   ├── ai.ts                  # summarizeQuick / analyzeDeep / synthesizeSpeech
│   ├── router.ts              # Deterministic on-device vs cloud routing
│   ├── parse.ts               # Quick-summary output parser
│   ├── config.ts              # Loads firebase-config.local.js (gitignored)
│   ├── firebase-config.example.js
│   ├── firebase-config.local.js   # <-- YOU fill this in (not committed)
│   ├── history.ts             # localStorage history
│   ├── i18n.ts                # ID/EN strings
│   ├── samples.ts             # Demo texts (ID article, EN lecture notes)
│   └── styles.css
├── tests/run.mjs              # node:test unit tests
├── README.md
└── LICENSE (MIT)
```

## ⚠️ Known limitations / next steps

- **Firestore history sync** is a stretch goal — history is localStorage-only
  for now (works offline, per-device).
- **Demo video** (English) still to be recorded after the cloud path is
  verified with a real config.
- TTS input is trimmed to ~4.000 chars (model input limit 8.192 tokens).
- Deep analysis is cloud-only by design (needs reasoning + JSON schema).

## 📚 References (verified 2026-11-24)

- Firebase AI Logic overview: https://firebase.google.com/docs/ai-logic
- Get started (Web): https://firebase.google.com/docs/ai-logic/get-started
- Hybrid web get-started: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- Hybrid config options (`inferenceSource`, `inCloudParams`):
  https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
- Supported models (`gemini-3.8-flash`, `gemini-3.8-flash-tts`):
  https://firebase.google.com/docs/ai-logic/models
- Generate speech (TTS): https://firebase.google.com/docs/ai-logic/generate-speech
- App Check debug provider: https://firebase.google.com/docs/app-check/web/debug-provider

## 📄 License

MIT — see [LICENSE](LICENSE).
