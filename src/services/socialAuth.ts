/**
 * Native Google sign-in, loaded LAZILY.
 *
 * Both libraries contain native code. In Expo Go (or before you have installed them) that code does not exist,
 * so they are required inside functions, never at the top of a file. If they are unavailable the buttons simply
 * do not appear and the rest of the app is unaffected.
 *
 * Install once:   npx expo install @react-native-google-signin/google-signin
 * Then use a development build (`eas build --profile development`); see docs/SOCIAL_LOGIN_SETUP.md.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config/env';

/** Thrown for real failures. A person pressing Cancel is NOT an error: those functions return null. */
export class SocialAuthError extends Error {}

function hasGoogleNativeModule(): boolean {
  // Google Sign-In is not bundled into Expo Go. appOwnership remains the reliable
  // Expo Go discriminator; development builds have a native module linked in.
  return Constants.appOwnership !== 'expo';
}

// ---------------- Google ----------------

let googleConfigured = false;

function loadGoogle(): any | null {
  try {
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null; // package not installed, or no native module (Expo Go)
  }
}

export function googleAvailable(): boolean {
  // Keep the entry point visible when configured even in Expo Go; the native module error
  // is surfaced on tap, while development/production builds provide the actual native flow.
  return !!GOOGLE_WEB_CLIENT_ID;
}

/**
 * Returns a Google ID token for the server to verify, or null if the person cancelled.
 * `webClientId` makes the token's audience the WEB client id, which is the one /auth/google accepts.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!hasGoogleNativeModule()) {
    throw new SocialAuthError('Google sign-in needs an EraVenda development build. Please install the app build instead of opening it in Expo Go.');
  }
  const mod = loadGoogle();
  if (!mod || !GOOGLE_WEB_CLIENT_ID) throw new SocialAuthError('Google sign-in is not available in this build.');
  const { GoogleSignin, statusCodes, isErrorWithCode } = mod;
  try {
    if (!googleConfigured) {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined });
      googleConfigured = true;
    }
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    // Newer versions return {type, data}; older ones return the user object directly.
    if (res?.type === 'cancelled') return null;
    const idToken: string | undefined = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new SocialAuthError('Google did not return a sign-in token. Please try again.');
    return idToken;
  } catch (e: any) {
    if (e instanceof SocialAuthError) throw e;
    if (isErrorWithCode?.(e) && e.code === statusCodes?.SIGN_IN_CANCELLED) return null;
    if (isErrorWithCode?.(e) && e.code === statusCodes?.IN_PROGRESS) return null;
    throw new SocialAuthError(e?.message || 'Google sign-in failed. Please try again.');
  }
}

/** Forget the Google session on this phone so the next sign-in lets the person choose an account. */
export async function googleSignOut(): Promise<void> {
  if (!hasGoogleNativeModule()) return;
  try {
    await loadGoogle()?.GoogleSignin?.signOut();
  } catch {
    /* best effort */
  }
}

