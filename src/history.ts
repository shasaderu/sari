/** Local history (localStorage). Firestore sync is a stretch goal — see README. */

export interface HistoryEntry {
  id: string;
  createdAt: number;
  title: string;
  summary: string;
  source: "on-device" | "cloud";
  lang: string;
  chars: number;
  deep?: {
    keyPoints: string[];
    actionItems: string[];
    flashcards: { q: string; a: string }[];
    quiz: { q: string; options: string[]; answer: number }[];
  };
}

const KEY = "sari.history.v1";
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const list = [full, ...loadHistory()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full/blocked: drop the oldest half and retry once.
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 25)));
    } catch {
      /* give up silently — history is a convenience, not core */
    }
  }
  return full;
}

export function deleteEntry(id: string): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(loadHistory().filter((e) => e.id !== id)),
    );
  } catch {
    /* ignore */
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
