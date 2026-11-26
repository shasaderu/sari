/**
 * Firebase config loader.
 *
 * The real config lives in `firebase-config.local.js` (NOT committed, see
 * .gitignore). It is loaded with import.meta.glob so the app still builds
 * and boots when the file is missing — the UI then shows a setup banner
 * instead of crashing.
 *
 * The parent fills in the real values from the Firebase console
 * (Project settings -> Your apps -> Web app).
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AppCheckConfig {
  /** Enable App Check debug mode (local dev / submission demo). */
  debug: boolean;
  /** reCAPTCHA Enterprise site key for production App Check. Optional in dev. */
  recaptchaEnterpriseSiteKey: string | null;
}

export interface SariConfig {
  firebase: FirebaseWebConfig | null;
  appCheck: AppCheckConfig;
}

interface LocalConfigModule {
  firebase?: Partial<FirebaseWebConfig>;
  appCheck?: Partial<AppCheckConfig>;
}

const REQUIRED_FIREBASE_KEYS: (keyof FirebaseWebConfig)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes("PASTE_") || value.includes("YOUR_");
}

function loadLocalConfig(): SariConfig {
  const modules = import.meta.glob("./firebase-config.local.js", {
    eager: true,
    import: "default",
  }) as Record<string, LocalConfigModule>;

  const local = Object.values(modules)[0];
  if (!local?.firebase) {
    return {
      firebase: null,
      appCheck: { debug: true, recaptchaEnterpriseSiteKey: null },
    };
  }

  const fb = local.firebase;
  const missing = REQUIRED_FIREBASE_KEYS.filter((k) => isPlaceholder(fb[k]));
  if (missing.length > 0) {
    return {
      firebase: null,
      appCheck: {
        debug: local.appCheck?.debug ?? true,
        recaptchaEnterpriseSiteKey:
          local.appCheck?.recaptchaEnterpriseSiteKey ?? null,
      },
    };
  }

  return {
    firebase: fb as FirebaseWebConfig,
    appCheck: {
      debug: local.appCheck?.debug ?? true,
      recaptchaEnterpriseSiteKey:
        local.appCheck?.recaptchaEnterpriseSiteKey ?? null,
    },
  };
}

export const config: SariConfig = loadLocalConfig();
export const isConfigured = config.firebase !== null;
