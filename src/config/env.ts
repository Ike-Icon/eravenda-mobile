/**
 * Runtime configuration. EXPO_PUBLIC_* variables are inlined at build time by Expo,
 * so they are visible inside the app bundle: never put secrets here.
 * (Paystack secret keys and Cloudinary API secrets stay on the server.)
 */
const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  // Fail loudly in development instead of sending requests to "undefined/products".
  console.warn('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and restart Expo.');
}

/** e.g. https://eravenda.onrender.com/api (no trailing slash) */
export const API_URL = (raw ?? 'http://localhost:8000/api').replace(/\/+$/, '');

/**
 * Google sign-in. WEB client id = the same one the website uses (the server only accepts tokens issued to it).
 * iOS client id = a separate "iOS" OAuth client from the same Google Cloud project (needs the app's bundle id).
 * Both are public identifiers, not secrets. Leave the web id empty to hide the Google button.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** e.g. https://eravenda.onrender.com. Used to resolve relative image paths like /static/img/... */
export const SITE_ORIGIN = API_URL.replace(/\/api$/, '');
