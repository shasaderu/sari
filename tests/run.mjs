/**
 * Unit tests for the pure logic (router + quick-summary parser).
 * No Firebase, no DOM, no network — run with:  node tests/run.mjs
 * (tsc strips types via a tiny transform-free approach: the modules under
 * test are imported through a .mjs re-implementation? No — we compile the
 * real TS with esbuild-free `node --experimental-strip-types`.)
 *
 * Requires Node 22.6+ (type stripping) or run `npx tsc` first.
 * Simpler: `npm test` uses node --experimental-strip-types.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { routeSummary } from "../src/router.ts";
import { parseQuick } from "../src/parse.ts";

test("router: short text + nano available -> prefer_on_device", () => {
  const r = routeSummary({ chars: 500, online: true, nano: "available", privacyOnly: false });
  assert.equal(r.mode, "prefer_on_device");
  assert.equal(r.reason, "device");
});

test("router: long text -> cloud only", () => {
  const r = routeSummary({ chars: 9000, online: true, nano: "available", privacyOnly: false });
  assert.equal(r.mode, "only_in_cloud");
  assert.equal(r.reason, "cloud-long");
});

test("router: offline -> on-device only", () => {
  const r = routeSummary({ chars: 500, online: false, nano: "available", privacyOnly: false });
  assert.equal(r.mode, "only_on_device");
  assert.equal(r.reason, "offline");
});

test("router: nano missing -> cloud only (explicit, no surprise fallback)", () => {
  const r = routeSummary({ chars: 500, online: true, nano: "unsupported", privacyOnly: false });
  assert.equal(r.mode, "only_in_cloud");
  assert.equal(r.reason, "cloud-nano-missing");
});

test("router: privacy mode -> on-device only even when online", () => {
  const r = routeSummary({ chars: 500, online: true, nano: "available", privacyOnly: true });
  assert.equal(r.mode, "only_on_device");
  assert.equal(r.reason, "privacy");
});

test("router: nano downloading still prefers on-device (SDK downloads it)", () => {
  const r = routeSummary({ chars: 500, online: true, nano: "downloading", privacyOnly: false });
  assert.equal(r.mode, "prefer_on_device");
});

test("parseQuick: ID format", () => {
  const p = parseQuick("JUDUL: Belajar Fotosintesis\nRINGKASAN: Tumbuhan mengubah cahaya menjadi energi.", "id");
  assert.equal(p.title, "Belajar Fotosintesis");
  assert.equal(p.summary, "Tumbuhan mengubah cahaya menjadi energi.");
});

test("parseQuick: EN format", () => {
  const p = parseQuick("TITLE: Photosynthesis Basics\nSUMMARY: Plants turn light into energy.", "en");
  assert.equal(p.title, "Photosynthesis Basics");
  assert.equal(p.summary, "Plants turn light into energy.");
});

test("parseQuick: unformatted text falls back gracefully", () => {
  const p = parseQuick("Plants turn light into chemical energy. They need water and CO2.", "en");
  assert.ok(p.title.length > 0);
  assert.ok(p.summary.includes("Plants turn light"));
});
