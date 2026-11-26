/**
 * Sari — UI wiring. No AI calls here; all inference lives in ai.ts and
 * all Firebase setup in firebase.ts.
 */

import { config, isConfigured } from "./config";
import {
  getAppCheckError,
  getAppCheckState,
  initFirebase,
} from "./firebase";
import {
  analyzeDeep,
  friendlyError,
  probeNano,
  summarizeQuick,
  synthesizeSpeech,
  type DeepResult,
  type QuickResult,
} from "./ai";
import { routeSummary, type NanoStatus } from "./router";
import {
  clearHistory,
  deleteEntry,
  loadHistory,
  saveEntry,
  type HistoryEntry,
} from "./history";
import { SAMPLE_EN, SAMPLE_ID } from "./samples";
import { STRINGS, type Lang, type Strings } from "./i18n";

let lang: Lang = "id";
let t: Strings = STRINGS.id;
let nanoStatus: NanoStatus = "unsupported";
let current: { title: string; summary: string; source: "on-device" | "cloud"; deep?: DeepResult } | null = null;
let audioCtx: AudioContext | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  text: $<HTMLTextAreaElement>("source-text"),
  charCount: $("char-count"),
  routeNote: $("route-note"),
  btnQuick: $<HTMLButtonElement>("btn-quick"),
  btnDeep: $<HTMLButtonElement>("btn-deep"),
  btnTts: $<HTMLButtonElement>("btn-tts"),
  btnCopy: $<HTMLButtonElement>("btn-copy"),
  btnSave: $<HTMLButtonElement>("btn-save"),
  progress: $("progress"),
  error: $("error"),
  empty: $("empty-state"),
  result: $("result"),
  resultTitle: $("result-title"),
  badge: $("engine-badge"),
  engineNote: $("engine-note"),
  summary: $("result-summary"),
  ttsStatus: $("tts-status"),
  ttsPlayer: $<HTMLAudioElement>("tts-player"),
  deepSection: $("deep-section"),
  keyPoints: $("key-points"),
  actionItems: $("action-items"),
  flashcards: $("flashcards"),
  quiz: $("quiz"),
  historyList: $("history-list"),
  chipNano: $("chip-nano"),
  chipFirebase: $("chip-firebase"),
  chipAppCheck: $("chip-appcheck"),
  chipNet: $("chip-net"),
  setupBanner: $("setup-banner"),
};

/* ---------------- i18n ---------------- */

function applyLang(): void {
  t = STRINGS[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n") as keyof Strings;
    const value = t[key];
    if (typeof value === "string") el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const key = el.getAttribute("data-i18n-ph") as keyof Strings;
    const value = t[key];
    if (typeof value === "string") (el as HTMLTextAreaElement).placeholder = value;
  });
  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.classList.toggle("active", b.id === `lang-${lang}`);
  });
  updateCharCount();
  renderHistory();
  refreshChips();
}

/* ---------------- status chips ---------------- */

type ChipState = "ok" | "warn" | "bad" | "unknown";

function setChip(
  chip: HTMLElement,
  state: ChipState,
  text: string,
): void {
  const dot = chip.querySelector(".dot");
  if (dot) dot.className = `dot dot-${state}`;
  const span = chip.querySelector("span:last-child");
  if (span) span.textContent = text;
}

function refreshChips(): void {
  // Nano
  const nanoMap: Record<NanoStatus, [ChipState, string]> = {
    available: ["ok", t.nanoAvailable],
    downloading: ["warn", t.nanoDownloading],
    downloadable: ["warn", t.nanoDownloadable],
    unavailable: ["bad", t.nanoUnavailable],
    unsupported: ["bad", t.nanoUnsupported],
  };
  const [nanoState, nanoText] = nanoMap[nanoStatus];
  setChip(els.chipNano, nanoState, nanoText);

  // Firebase
  setChip(
    els.chipFirebase,
    isConfigured ? "ok" : "bad",
    isConfigured ? t.firebaseOk : t.firebaseMissing,
  );

  // App Check
  const ac = getAppCheckState();
  setChip(
    els.chipAppCheck,
    ac === "debug" ? "warn" : ac === "active" ? "ok" : ac === "error" ? "bad" : "unknown",
    ac === "debug"
      ? t.appCheckDebug
      : ac === "active"
        ? t.appCheckOn
        : ac === "error"
          ? getAppCheckError() ?? t.appCheckOff
          : t.appCheckOff,
  );

  // Network
  setChip(els.chipNet, navigator.onLine ? "ok" : "bad", navigator.onLine ? t.chipNet : t.chipNetOff);
}

/* ---------------- input / routing hint ---------------- */

function updateCharCount(): void {
  const n = els.text.value.length;
  els.charCount.textContent = t.chars(n);
  if (n === 0) {
    els.routeNote.textContent = "";
    return;
  }
  const route = routeSummary({
    chars: n,
    online: navigator.onLine,
    nano: nanoStatus,
    privacyOnly: false,
  });
  els.routeNote.textContent =
    route.reason === "device"
      ? t.routeDevice
      : route.reason === "cloud-long"
        ? t.routeCloudLong
        : route.reason === "offline"
          ? t.routeOffline
          : "";
}

/* ---------------- results ---------------- */

function showResult(r: QuickResult, deep?: DeepResult): void {
  current = { title: r.title, summary: r.summary, source: r.source, deep };
  els.empty.classList.add("hidden");
  els.result.classList.remove("hidden");
  els.resultTitle.textContent = r.title;
  els.summary.textContent = r.summary;

  const badge = els.badge;
  if (r.source === "on-device") {
    badge.textContent = t.badgeDevice;
    badge.className = "badge badge-device";
    els.engineNote.textContent = t.noteDevice;
  } else {
    badge.textContent = t.badgeCloud;
    badge.className = "badge badge-cloud";
    els.engineNote.textContent =
      r.fallback === "cloud-long"
        ? t.noteCloudLong
        : r.fallback === "cloud-nano-missing"
          ? t.noteCloudFallback
          : r.fallback === "cloud-fallback"
            ? t.noteCloudFallback
            : t.noteCloudDeep;
  }

  // Deep section
  if (deep) {
    els.deepSection.classList.remove("hidden");
    els.keyPoints.innerHTML = deep.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
    els.actionItems.innerHTML = deep.actionItems.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
    els.flashcards.innerHTML = "";
    deep.flashcards.forEach((f) => {
      const card = document.createElement("div");
      card.className = "flashcard";
      card.innerHTML = `<div class="q">${escapeHtml(f.q)}</div><div class="a hidden">${escapeHtml(f.a)}</div><div class="flip-hint">${escapeHtml(t.flipHint)}</div>`;
      card.addEventListener("click", () => {
        card.querySelector(".a")?.classList.toggle("hidden");
      });
      els.flashcards.appendChild(card);
    });
    els.quiz.innerHTML = "";
    deep.quiz.forEach((q, qi) => {
      const box = document.createElement("div");
      box.className = "quiz-q";
      const opts = q.options
        .map(
          (o, oi) =>
            `<label><input type="radio" name="quiz-${qi}" value="${oi}" /> ${escapeHtml(o)}</label>`,
        )
        .join("");
      box.innerHTML = `<p>${qi + 1}. ${escapeHtml(q.q)}</p>${opts}<div class="verdict"></div>`;
      box.addEventListener("change", () => {
        const checked = box.querySelector<HTMLInputElement>("input:checked");
        const verdict = box.querySelector(".verdict") as HTMLElement;
        if (!checked) return;
        const ok = Number(checked.value) === q.answer;
        verdict.textContent = ok ? t.correct : t.wrong;
        verdict.className = `verdict ${ok ? "ok" : "no"}`;
      });
      els.quiz.appendChild(box);
    });
  } else {
    els.deepSection.classList.add("hidden");
  }

  els.ttsStatus.textContent = "";
  els.ttsPlayer.classList.add("hidden");
  els.ttsPlayer.removeAttribute("src");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function setBusy(busy: boolean): void {
  els.btnQuick.disabled = busy || !isConfigured;
  els.btnDeep.disabled = busy || !isConfigured;
  els.btnTts.disabled = busy || !current;
}

function showError(message: string): void {
  els.error.textContent = message;
  els.error.classList.remove("hidden");
}

function clearError(): void {
  els.error.classList.add("hidden");
  els.error.textContent = "";
}

/* ---------------- actions ---------------- */

async function onQuick(): Promise<void> {
  const text = els.text.value.trim();
  if (!text) {
    showError(t.needText);
    return;
  }
  clearError();
  setBusy(true);
  els.progress.textContent = t.progressDevice;
  try {
    const r = await summarizeQuick(text, lang, {
      nano: nanoStatus,
      onProgress: (m) => {
        if (m.startsWith("download:")) {
          els.progress.textContent = t.progressDownloading(Number(m.split(":")[1]));
        }
      },
    });
    els.progress.textContent = "";
    showResult(r);
  } catch (err) {
    els.progress.textContent = "";
    showError(friendlyError(err));
  } finally {
    setBusy(false);
  }
}

async function onDeep(): Promise<void> {
  const text = els.text.value.trim();
  if (!text) {
    showError(t.needText);
    return;
  }
  clearError();
  setBusy(true);
  els.progress.textContent = t.progressDeep;
  try {
    // Deep analysis runs in the cloud; reuse the quick summary for the
    // title when the on-device path already produced one.
    const deep = await analyzeDeep(text, lang);
    const title = current?.title ?? (lang === "id" ? "Analisis Mendalam" : "Deep Analysis");
    const summary =
      current?.summary ?? deep.keyPoints.slice(0, 2).join(" ");
    showResult(
      { title, summary, source: "cloud", fallback: "none" },
      deep,
    );
    els.progress.textContent = "";
  } catch (err) {
    els.progress.textContent = "";
    showError(friendlyError(err));
  } finally {
    setBusy(false);
  }
}

async function onTts(): Promise<void> {
  if (!current) {
    showError(t.needSummaryFirst);
    return;
  }
  clearError();
  setBusy(true);
  els.ttsStatus.textContent = t.progressTts;
  try {
    const { wavBase64, mimeType, trimmed } = await synthesizeSpeech(current.summary, lang);
    const bytes = Uint8Array.from(atob(wavBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    els.ttsPlayer.src = url;
    els.ttsPlayer.classList.remove("hidden");
    els.ttsStatus.textContent = t.ttsDone + (trimmed ? ` ${t.ttsTooLong}` : "");
    // Autoplay attempt (may be blocked until a user gesture — the click counts).
    try {
      await els.ttsPlayer.play();
    } catch {
      /* user can press play manually */
    }
    void audioCtx;
  } catch (err) {
    els.ttsStatus.textContent = "";
    showError(friendlyError(err));
  } finally {
    setBusy(false);
  }
}

function onCopy(): void {
  if (!current) return;
  const text = `${current.title}\n\n${current.summary}`;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      els.ttsStatus.textContent = t.copied;
    })
    .catch(() => showError("Clipboard tidak tersedia."));
}

function onSave(): void {
  if (!current) return;
  saveEntry({
    title: current.title,
    summary: current.summary,
    source: current.source,
    lang,
    chars: els.text.value.length,
    deep: current.deep,
  });
  els.ttsStatus.textContent = t.saved;
  renderHistory();
}

/* ---------------- history UI ---------------- */

function renderHistory(): void {
  const list = loadHistory();
  els.historyList.innerHTML = "";
  if (list.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = t.historyEmpty;
    els.historyList.appendChild(li);
    return;
  }
  list.forEach((e: HistoryEntry) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const date = new Date(e.createdAt).toLocaleString(
      lang === "id" ? "id-ID" : "en-US",
      { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
    );
    li.innerHTML = `<div class="t">${escapeHtml(e.title)}</div><div class="m">${escapeHtml(
      e.source === "on-device" ? t.badgeDevice : t.badgeCloud,
    )} · ${date}</div><button class="del" type="button">${escapeHtml(t.delete)}</button>`;
    li.addEventListener("click", (ev) => {
      if ((ev.target as HTMLElement).classList.contains("del")) return;
      showResult(
        { title: e.title, summary: e.summary, source: e.source, fallback: "none" },
        e.deep,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    li.querySelector(".del")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteEntry(e.id);
      renderHistory();
    });
    els.historyList.appendChild(li);
  });
}

/* ---------------- boot ---------------- */

function init(): void {
  applyLang();

  // Setup banner when Firebase config is missing.
  if (!isConfigured) {
    els.setupBanner.innerHTML =
      `<strong>${escapeHtml(t.setupTitle)}</strong> ${escapeHtml(t.setupBody)}`;
    els.setupBanner.classList.remove("hidden");
    setBusy(false);
    els.btnQuick.disabled = true;
    els.btnDeep.disabled = true;
    els.btnTts.disabled = true;
  } else {
    const ok = initFirebase();
    if (!ok) {
      els.setupBanner.innerHTML =
        `<strong>${escapeHtml(t.setupTitle)}</strong> ${escapeHtml(t.setupBody)}`;
      els.setupBanner.classList.remove("hidden");
    }
    refreshChips();
  }

  // Probe Nano availability (informational — routing uses the result).
  void probeNano().then((s) => {
    nanoStatus = s;
    refreshChips();
    updateCharCount();
  });

  window.addEventListener("online", refreshChips);
  window.addEventListener("offline", refreshChips);

  els.text.addEventListener("input", updateCharCount);
  els.btnQuick.addEventListener("click", () => void onQuick());
  els.btnDeep.addEventListener("click", () => void onDeep());
  els.btnTts.addEventListener("click", () => void onTts());
  els.btnCopy.addEventListener("click", onCopy);
  els.btnSave.addEventListener("click", onSave);
  $("sample-id").addEventListener("click", () => {
    els.text.value = SAMPLE_ID;
    updateCharCount();
  });
  $("sample-en").addEventListener("click", () => {
    els.text.value = SAMPLE_EN;
    updateCharCount();
  });
  $("clear-text").addEventListener("click", () => {
    els.text.value = "";
    updateCharCount();
  });
  $("btn-clear-history").addEventListener("click", () => {
    clearHistory();
    renderHistory();
  });
  $("lang-id").addEventListener("click", () => {
    lang = "id";
    applyLang();
  });
  $("lang-en").addEventListener("click", () => {
    lang = "en";
    applyLang();
  });

  renderHistory();
  updateCharCount();
  void config; // config is imported for its side effect (glob load)
}

init();
