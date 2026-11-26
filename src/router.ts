/**
 * Deterministic router: decides WHERE a summary runs before any AI call.
 *
 * Why deterministic (not "let the SDK decide")? Two failure modes the SDK
 * fallback alone does not handle well:
 *  1. Long input: Nano throws QuotaExceededError, which PREFER_ON_DEVICE
 *     does not always catch — we route long text straight to the cloud.
 *  2. Offline / privacy: the cloud is unreachable or unwanted — we pin
 *     ONLY_ON_DEVICE instead of letting the call fail in the cloud.
 *
 * The router's decision + reason are shown in the UI (transparent routing).
 */

export type NanoStatus =
  | "available"
  | "downloading"
  | "downloadable"
  | "unavailable"
  | "unsupported";

export type Engine = "hybrid" | "cloud";

/** Rough on-device window for a quick summary (chars, not tokens). */
export const ON_DEVICE_MAX_CHARS = 6000;

export interface RouteInput {
  chars: number;
  online: boolean;
  nano: NanoStatus;
  /** User asked for on-device only (privacy mode). */
  privacyOnly: boolean;
}

export interface Route {
  engine: Engine;
  /** Firebase InferenceMode value passed straight to getGenerativeModel. */
  mode: "prefer_on_device" | "only_on_device" | "only_in_cloud";
  reason: "device" | "cloud-long" | "offline" | "privacy" | "cloud-nano-missing";
}

export function routeSummary(input: RouteInput): Route {
  if (input.privacyOnly) {
    return { engine: "hybrid", mode: "only_on_device", reason: "privacy" };
  }
  if (!input.online) {
    return { engine: "hybrid", mode: "only_on_device", reason: "offline" };
  }
  if (input.chars > ON_DEVICE_MAX_CHARS) {
    return { engine: "cloud", mode: "only_in_cloud", reason: "cloud-long" };
  }
  if (input.nano === "unavailable" || input.nano === "unsupported") {
    // Nano is known-absent: go straight to cloud so the user is not
    // surprised by a slow fallback; the UI still says so explicitly.
    return { engine: "cloud", mode: "only_in_cloud", reason: "cloud-nano-missing" };
  }
  return { engine: "hybrid", mode: "prefer_on_device", reason: "device" };
}
