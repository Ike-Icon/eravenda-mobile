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
