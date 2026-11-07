# Google sign-in setup

The app sends Google's ID token to `POST /api/auth/google`. The server verifies it and returns EraVenda's session token.
If the Google email already belongs to an EraVenda account, the server links the account instead of creating a duplicate.

Google sign-in uses native code and needs an Expo development or production build; it cannot complete in Expo Go.

## Configure Google

Use the same Google Cloud project as the website. The web OAuth client ID is the audience accepted by the API.

1. Create an iOS OAuth client with the bundle ID from `app.json`. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `GOOGLE_IOS_URL_SCHEME` (the `com.googleusercontent.apps.…` URL scheme) in `.env` and EAS profiles.
2. Create an Android OAuth client with the package name from `app.json`. Add the SHA-1 fingerprints for development, production, and Play App Signing certificates.
3. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the web OAuth client ID in `.env` and EAS profiles. This public identifier is required for the button to appear and for the API to accept the token.
4. Set the OAuth consent screen to Production or add the intended testers, with the `email` and `profile` scopes.
5. Keep the server's `GOOGLE_CLIENT_ID` set to that same web client ID.

## Check sign-in

- Install a development build on a physical iPhone and an Android device or Google Play enabled emulator.
- Tap Continue with Google and complete the account chooser.
- Sign out and sign in again to verify that the account chooser appears.
- Cancel the chooser and confirm the app stays on the login screen without an error.

If the Google button is missing, check that `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is nonempty in the build environment and restart/rebuild after changing it. If it is visible but native sign-in reports unavailable, use a development build instead of Expo Go.

## Android `DEVELOPER_ERROR` (code 10)

The app passes the Web OAuth client ID to `GoogleSignin.configure()`. `DEVELOPER_ERROR` means Google's server-side Android OAuth configuration does not match the installed app; it is not fixed by changing the sign-in button or rebuilding with the same signing key.

For an EAS-installed APK:

1. From the project root, run `npx eas-cli credentials -p android` and select the profile used to build the installed APK (for example, `preview`). Note its **SHA-1** certificate fingerprint. Do not use SHA-256.
2. In the same Google Cloud project that owns `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, create or correct an OAuth client of type **Android** with package name `com.eravenda.market` and that SHA-1.
3. Confirm `GoogleSignin.configure({ webClientId })` uses the OAuth client of type **Web**. This app currently does that through `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
4. Rebuild and reinstall only if the package ID, signing key, or build configuration changed. OAuth client updates usually apply to the existing install after Google propagates them.

If the app was installed from Google Play, also add the **App signing key certificate SHA-1** shown in Play Console under the app's App integrity/App signing page. Play Store signs the installed app with that certificate, which may differ from the EAS upload key. For each different build signing key (development, preview/production EAS, and Play App Signing), register a matching Android OAuth client with the same package name.

The package name configured for this app is `com.eravenda.market` (`app.json`).
