/** Pure parsing of the quick-summary model output. No DOM, no Firebase. */

import type { Lang } from "./i18n";

export function parseQuick(
  raw: string,
  lang: Lang,
): { title: string; summary: string } {
  const titleRe = lang === "id" ? /JUDUL:\s*(.+)/i : /TITLE:\s*(.+)/i;
  const sumRe =
    lang === "id" ? /RINGKASAN:\s*([\s\S]+)/i : /SUMMARY:\s*([\s\S]+)/i;
  const titleMatch = raw.match(titleRe);
  const sumMatch = raw.match(sumRe);
  if (titleMatch && sumMatch) {
    return {
      title: titleMatch[1].trim().replace(/^["“]|["”]$/g, ""),
      summary: sumMatch[1].trim(),
    };
  }
  // Lenient fallback: first sentence-ish as title, whole text as summary.
  const cleaned = raw.trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s/)[0] ?? cleaned;
  const words = firstSentence.split(/\s+/).slice(0, 8).join(" ");
  return { title: words, summary: cleaned };
}
