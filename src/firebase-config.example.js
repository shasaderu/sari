/**
 * Sari — Firebase config TEMPLATE.
 *
 * 1. Copy this file to `firebase-config.local.js` (same folder).
 * 2. Fill in the values from Firebase console:
 *    Project settings -> Your apps -> Web app (</>).
 * 3. NEVER commit `firebase-config.local.js` — it is gitignored.
 *
 * App Check:
 * - `debug: true` = local dev / submission demo. The SDK prints a debug
 *   token in the browser console; safelist it in Firebase console ->
 *   App Check -> Apps -> Manage debug tokens.
 * - For production, set `debug: false` and fill
 *   `recaptchaEnterpriseSiteKey` (App Check -> reCAPTCHA Enterprise).
 */

export default {
  firebase: {
    apiKey: "PASTE_YOUR_API_KEY",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID",
    // measurementId: "PASTE_YOUR_MEASUREMENT_ID", // optional
  },
  appCheck: {
    debug: true,
    recaptchaEnterpriseSiteKey: null, // e.g. "6Lc..." — production only
  },
};
