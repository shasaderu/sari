/**
 * UI strings (ID / EN). AI prompts live in ai.ts and follow the same
 * language choice so summaries come back in the UI language.
 */

export type Lang = "id" | "en";

export const STRINGS = {
  id: {
    tagline: "Peringkas catatan hybrid — cepat di perangkat, mendalam di cloud.",
    chipNano: "Nano: memeriksa…",
    chipFirebase: "Firebase: memeriksa…",
    chipAppCheck: "App Check: memeriksa…",
    chipNet: "Online",
    chipNetOff: "Offline",
    inputTitle: "Tempel teksmu",
    inputHint:
      "Artikel, catatan kuliah, atau chat — Sari merangkumnya. Teks tidak pernah meninggalkan perangkatmu saat diproses on-device.",
    inputPlaceholder: "Tempel artikel, catatan kuliah, atau chat di sini…",
    trySample: "Coba contoh:",
    clearBtn: "Bersihkan",
    btnQuick: "Ringkasan Cepat",
    btnQuickSub: "On-device dulu",
    btnDeep: "Analisis Mendalam",
    btnDeepSub: "Cloud · poin kunci + kuis",
    emptyTitle: "Belum ada ringkasan.",
    emptyHint:
      "Tempel teks lalu tekan “Ringkasan Cepat” — Nano di perangkatmu menjawab dalam hitungan detik, tanpa internet.",
    btnTts: "Bacakan Ringkasan",
    btnTtsSub: "Gemini TTS · cloud",
    btnCopy: "📋 Salin",
    btnSave: "💾 Simpan ke Riwayat",
    keyPoints: "Poin Kunci",
    actionItems: "Action Items",
    flashcards: "Flashcard",
    quiz: "Kuis Cepat",
    historyTitle: "Riwayat",
    historyHint: "Tersimpan lokal di browser ini (localStorage).",
    clearHistory: "Hapus semua riwayat",
    footer:
      "Semua inferensi AI hanya lewat Firebase AI Logic (Firebase JS SDK). Tidak ada panggilan langsung ke Gemini API atau API lain.",
    fineprint:
      "On-device: Gemini Nano (Chrome Prompt API) · Cloud: Gemini 3.8 Flash · Suara: Gemini 3.8 Flash TTS",
    chars: (n: number) => `${n.toLocaleString("id-ID")} karakter`,
    setupTitle: "Firebase belum dikonfigurasi.",
    setupBody:
      "Salin src/firebase-config.example.js menjadi src/firebase-config.local.js lalu isi dengan config Web app dari Firebase console. Tanpa config, tombol AI nonaktif.",
    nanoAvailable: "Nano: tersedia ✓",
    nanoDownloading: "Nano: mengunduh model…",
    nanoDownloadable: "Nano: siap diunduh",
    nanoUnavailable: "Nano: tidak tersedia",
    nanoUnsupported: "Nano: browser ini tidak mendukung Prompt API",
    firebaseOk: "Firebase: terhubung",
    firebaseMissing: "Firebase: belum dikonfigurasi",
    appCheckDebug: "App Check: mode debug",
    appCheckOn: "App Check: aktif",
    appCheckOff: "App Check: belum dikonfigurasi",
    routeDevice: "→ Ringkas Cepat akan memakai Gemini Nano di perangkat.",
    routeCloudLong: "→ Teks panjang: Ringkas Cepat akan memakai cloud (melebihi jendela Nano).",
    routeOffline: "→ Offline: hanya on-device yang bisa dipakai.",
    needText: "Tempel teks dulu ya.",
    needSummaryFirst: "Buat ringkasan dulu sebelum dibacakan.",
    copied: "Disalin ✓",
    saved: "Tersimpan ke riwayat ✓",
    historyEmpty: "Belum ada riwayat.",
    flipHint: "Klik untuk membalik",
    correct: "Benar ✓",
    wrong: "Belum tepat — jawaban benar ditandai.",
    delete: "Hapus",
    badgeDevice: "On-device (Nano)",
    badgeCloud: "Cloud (Gemini)",
    noteDevice:
      "Dibuat oleh Gemini Nano di perangkat ini — teks tidak dikirim ke internet.",
    noteCloudFallback:
      "On-device tidak tersedia, beralih ke cloud (Gemini 3.8 Flash). Teks dikirim ke Google untuk diproses.",
    noteCloudLong:
      "Teks panjang diproses di cloud (Gemini 3.8 Flash) karena melebihi jendela model on-device.",
    noteCloudDeep:
      "Analisis mendalam selalu memakai cloud (Gemini 3.8 Flash) — butuh penalaran + output JSON terstruktur.",
    noteTts: "Suara dibuat di cloud oleh Gemini 3.8 Flash TTS.",
    progressDevice: "Menyiapkan Gemini Nano di perangkat…",
    progressDownloading: (p: number) => `Mengunduh model Nano… ${p}%`,
    progressCloud: "Memproses di cloud…",
    progressDeep: "Menganalisis mendalam di cloud…",
    progressTts: "Membuat suara…",
    ttsDone: "Audio siap — tekan play ▶",
    ttsTooLong: "Ringkasan dipotong untuk TTS (maks. ~4.000 karakter).",
  },
  en: {
    tagline: "Hybrid note summarizer — fast on-device, deep in the cloud.",
    chipNano: "Nano: checking…",
    chipFirebase: "Firebase: checking…",
    chipAppCheck: "App Check: checking…",
    chipNet: "Online",
    chipNetOff: "Offline",
    inputTitle: "Paste your text",
    inputHint:
      "Articles, lecture notes, or chats — Sari summarizes them. Text never leaves your device when processed on-device.",
    inputPlaceholder: "Paste an article, lecture notes, or a chat here…",
    trySample: "Try a sample:",
    clearBtn: "Clear",
    btnQuick: "Quick Summary",
    btnQuickSub: "On-device first",
    btnDeep: "Deep Analysis",
    btnDeepSub: "Cloud · key points + quiz",
    emptyTitle: "No summary yet.",
    emptyHint:
      "Paste some text and press “Quick Summary” — Nano on your device answers in seconds, no internet needed.",
    btnTts: "Read Summary Aloud",
    btnTtsSub: "Gemini TTS · cloud",
    btnCopy: "📋 Copy",
    btnSave: "💾 Save to History",
    keyPoints: "Key Points",
    actionItems: "Action Items",
    flashcards: "Flashcards",
    quiz: "Quick Quiz",
    historyTitle: "History",
    historyHint: "Stored locally in this browser (localStorage).",
    clearHistory: "Clear all history",
    footer:
      "All AI inference goes only through Firebase AI Logic (Firebase JS SDK). No direct calls to the Gemini API or any other API.",
    fineprint:
      "On-device: Gemini Nano (Chrome Prompt API) · Cloud: Gemini 3.8 Flash · Voice: Gemini 3.8 Flash TTS",
    chars: (n: number) => `${n.toLocaleString("en-US")} characters`,
    setupTitle: "Firebase is not configured yet.",
    setupBody:
      "Copy src/firebase-config.example.js to src/firebase-config.local.js and fill it with your Web app config from the Firebase console. Without config, the AI buttons stay disabled.",
    nanoAvailable: "Nano: available ✓",
    nanoDownloading: "Nano: downloading model…",
    nanoDownloadable: "Nano: ready to download",
    nanoUnavailable: "Nano: unavailable",
    nanoUnsupported: "Nano: this browser has no Prompt API",
    firebaseOk: "Firebase: connected",
    firebaseMissing: "Firebase: not configured",
    appCheckDebug: "App Check: debug mode",
    appCheckOn: "App Check: active",
    appCheckOff: "App Check: not configured",
    routeDevice: "→ Quick Summary will use Gemini Nano on this device.",
    routeCloudLong: "→ Long text: Quick Summary will use the cloud (beyond Nano's window).",
    routeOffline: "→ Offline: only on-device can be used.",
    needText: "Please paste some text first.",
    needSummaryFirst: "Create a summary before playing audio.",
    copied: "Copied ✓",
    saved: "Saved to history ✓",
    historyEmpty: "No history yet.",
    flipHint: "Click to flip",
    correct: "Correct ✓",
    wrong: "Not quite — the right answer is marked.",
    delete: "Delete",
    badgeDevice: "On-device (Nano)",
    badgeCloud: "Cloud (Gemini)",
    noteDevice:
      "Made by Gemini Nano on this device — text was never sent to the internet.",
    noteCloudFallback:
      "On-device unavailable, switched to cloud (Gemini 3.8 Flash). Text was sent to Google for processing.",
    noteCloudLong:
      "Long text processed in the cloud (Gemini 3.8 Flash) because it exceeds the on-device model window.",
    noteCloudDeep:
      "Deep analysis always uses the cloud (Gemini 3.8 Flash) — it needs reasoning + structured JSON output.",
    noteTts: "Voice made in the cloud by Gemini 3.8 Flash TTS.",
    progressDevice: "Warming up Gemini Nano on this device…",
    progressDownloading: (p: number) => `Downloading the Nano model… ${p}%`,
    progressCloud: "Processing in the cloud…",
    progressDeep: "Deep analysis in the cloud…",
    progressTts: "Generating voice…",
    ttsDone: "Audio ready — press play ▶",
    ttsTooLong: "Summary trimmed for TTS (max ~4,000 characters).",
  },
} as const;

type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : string;

/** Widened (non-literal) view of the ID strings, so EN fits too. */
export type Strings = {
  [K in keyof (typeof STRINGS)["id"]]: Widen<(typeof STRINGS)["id"][K]>;
};
