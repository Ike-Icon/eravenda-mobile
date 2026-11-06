# EraVenda: build and release checklist

Work top to bottom. `npm run preflight` checks many of these automatically and prints what is still missing.
Store rules change; where this file says "check", confirm the current wording in App Store Connect / Play Console.

## 0. Decide before you build (these cannot be undone)
- [ ] **App identifiers.** `app.json` uses `com.eravenda.market` for both iOS (`ios.bundleIdentifier`) and Android (`android.package`). It is a placeholder. Once an app is published under an id, it can never change. Use a domain you control, for example `com.eravenda.app`.
- [ ] **App name** as customers will see it (`name` in `app.json`, currently "EraVenda").
- [ ] **Who owns the accounts.** Create the Apple, Google and Expo accounts under the business, not a personal login, so you can hand over access later.

## 1. Accounts
- [ ] Expo account (free): https://expo.dev, then `npm i -g eas-cli && eas login`.
- [ ] Apple Developer Program (US$99/year). Approval can take days; start now. https://developer.apple.com/programs
- [ ] Google Play Console (US$25 one-time). Check Google's current testing rule for new personal accounts: a closed test with a minimum number of testers for a set number of days has been required before production access. Organisation accounts may differ.
- [ ] A support email address and a public **privacy policy URL** (both stores require one). Your website may already have a privacy page; it must cover the data in `STORE_LISTING.md` section 6.

## 2. Backend must be ready first
- [ ] Apply `backend-patch/eravenda-server-changes.patch` from your project root (see `backend-patch/README.md`), commit, deploy on Render.
- [ ] Run `tests/test_account_deletion.py` against a throwaway database, then do one real deletion on a **staging** account.
- [ ] `https://YOUR-API/api/products` loads over HTTPS from your phone's browser.
- [ ] **Paystack live keys** set on the server only when you are ready for real money. Make one small real payment end to end before launch.
- [ ] Resend (email) is configured so order-status emails actually send; check one.
- [ ] Optional but wise: a staging copy of the API for the `preview` build so testers never touch live orders.

## 3. Assets (already generated; replace with designer artwork any time)
Run `npm run icons` to regenerate from `scripts/make-icons.py`.

| File | Size | Used for |
|---|---|---|
| `assets/icon.png` | 1024x1024, **no transparency** | iOS icon and default icon |
| `assets/adaptive-icon.png` | 1024x1024, transparent | Android adaptive icon (mark kept inside the central safe zone) |
| `assets/adaptive-icon-monochrome.png` | 1024x1024, transparent | Android 13+ themed icon |
| `assets/notification-icon.png` | 96x96, white on transparent | Android status-bar icon |
| `assets/splash-icon.png` | 1024x1024, transparent | Splash image (see step 4) |
| `store-assets/play-icon-512.png` | 512x512 | Play Store listing icon |
| `store-assets/play-feature-graphic-1024x500.png` | 1024x500 | Play Store feature graphic |

- [ ] Look at the icon on a real phone home screen (not only in a folder).
- [ ] **Screenshots** (you must capture these from the running app; see `STORE_LISTING.md` section 5 for the shot list). Apple asks for the sizes it lists in App Store Connect (6.9-inch iPhone screenshots are the usual required set). Google needs at least two phone screenshots.

## 4. Splash screen
`app.json` no longer has the old `splash` key. For a branded splash, install the plugin and add it to `app.json` plugins:

    npx expo install expo-splash-screen

    ["expo-splash-screen", { "image": "./assets/splash-icon.png", "backgroundColor": "#0F5C3F", "imageWidth": 200 }]

Check the plugin's current option names in its Expo docs if the build complains.

## 5. Push notifications setup
- [ ] `eas init` (adds `extra.eas.projectId` to `app.json`). The preflight fails until this exists.
- [ ] **iOS:** EAS creates the push key for you the first time you run an iOS build and sign in to your Apple account.
- [ ] **Android:** create a Firebase project, add an Android app with your package name, download `google-services.json` into the project root, and set `"android": { "googleServicesFile": "./google-services.json" }` in `app.json`. Then upload an FCM V1 service-account key to Expo (`eas credentials`, Android, Push Notifications). Follow Expo's current "Push notifications setup" guide for the exact screens.
- [ ] Do **not** commit `google-services.json`, `google-service-account.json`, or any `.p8`/`.jks` key (the `.gitignore` already excludes them).

## 5b. Social sign-in (Google + Apple)
- [ ] Follow `docs/SOCIAL_LOGIN_SETUP.md` end to end. **Apple requires Sign in with Apple whenever Google sign-in is offered on iOS** (guideline 4.8), so the two ship together.
- [ ] Set `APPLE_CLIENT_ID` on the server to both your Services ID and your app's bundle ID.
- [ ] Add the **Play app-signing SHA-1** to the Google Android client, or Google sign-in fails for store users.

## 6. EAS build profiles (`eas.json`)
Fill in `EXPO_PUBLIC_API_URL` in each profile (must end in `/api`). Environment variables from your local `.env` are **not** uploaded to EAS builds.

| Profile | Command | What you get | Use it for |
|---|---|---|---|
| `development` | `eas build -p ios --profile development` | Dev-client app on a real device | Testing push and native features while coding (`npx expo start --dev-client`) |
| `development-simulator` | `eas build -p ios --profile development-simulator` | Dev-client for the iOS simulator | Quick UI work without a phone |
| `preview` | `eas build -p android --profile preview` | Installable APK / ad-hoc iOS build | Sharing with testers outside the stores |
| `production` | `eas build -p all --profile production` | Store-ready builds (iOS IPA, Android AAB), version numbers auto-increment | Submitting to the stores |

- [ ] Run `npm run preflight` until it shows 0 errors.
- [ ] `npm run typecheck` is clean.
- [ ] iOS internal-distribution builds need devices registered (`eas device:create`); TestFlight does not.

## 7. Test on real devices before submitting
- [ ] Fresh install: sign up, confirm email, log in, log out, forgot-password email arrives.
- [ ] Browse retail and wholesale, search, category filter, product page with variants.
- [ ] Add to cart, a wholesale item below its minimum is flagged and fixed with "Add N more".
- [ ] Checkout with a saved address; pay with Paystack; the order shows as paid; cancel an unpaid order.
- [ ] Pay on delivery order; seller moves it through processing, dispatched, delivered; buyer sees the tracker update.
- [ ] A push arrives for each seller action, **with the app closed**, and tapping it opens the order. Check iOS and Android separately.
- [ ] Status emails arrive; switching email off in Account > Notifications stops them; push off stops pushes.
- [ ] Open a store, get approved, add a product with photos and variants, edit it, delete it.
- [ ] Sign out then sign in as a different user on the same phone: no notifications for the previous user.
- [ ] Delete a test account: blocked while it has an unpaid order (message says why), allowed after cancelling, then it can't sign in again and the confirmation email arrives.
- [ ] Airplane mode: friendly error messages, no crashes.
- [ ] Small phone, large phone, text size set to large, dark-mode phone (the app is light-only).

## 8. Store-required items (common rejection reasons)
- [ ] **Account deletion** is built: Account > Delete account in the app, and the public page `https://YOUR-SITE/delete-account` (deployed by the server patch).
  - Open that URL in a browser after deploying and check it loads.
  - **Google Play:** paste that URL into the Data safety form's account-deletion question.
  - **Apple:** mention the path (Account > Delete account) in the review notes. Test it with a throwaway account and confirm you cannot sign back in.
  - Read `backend-patch/README.md` section 2 so you know what is removed, anonymised and kept, and confirm it matches your privacy policy and legal advice.
- [ ] **Privacy policy URL** live and accurate.
- [ ] **Reviewer account.** Apple and Google reviewers need to sign in: create a buyer account (confirmed email) and, ideally, an approved seller account; put the credentials in the review notes. Explain how to test payment safely (see `STORE_LISTING.md` section 7).
- [ ] **Payments for physical goods** through Paystack are fine on both stores (in-app purchase rules cover digital goods). Say in the review notes that the app sells physical goods from third-party vendors.
- [ ] **User-generated content** (product photos, store descriptions, reviews) is covered by: pre-moderation (stores and products wait for admin approval), **Report** on every product page and store page, **Block store**, a "no objectionable content" clause in your Terms (shown at sign-up), and your contact page. Before submitting:
  - [ ] Deploy the server patch, open `https://YOUR-SITE/admin/reports.html` as an admin, and confirm it loads.
  - [ ] File a test report from the app; confirm the email reaches `ADMIN_NOTIFICATION_EMAIL`; resolve it from the admin page.
  - [ ] Decide who watches that mailbox and your response time (24 hours is common). Say it in the review notes.
  - [ ] Check `/terms` shows the new "No objectionable content" paragraph.
- [ ] **Age rating** questionnaires answered honestly (user-generated content, purchases).
- [ ] **Export compliance:** `ITSAppUsesNonExemptEncryption` is set to `false` because the app only uses standard HTTPS. Confirm that matches your situation.
- [ ] **Data safety (Google) and App Privacy (Apple)** answered from `STORE_LISTING.md` section 6.

## 9. Submit
    eas build -p all --profile production
    eas submit -p ios --profile production        # fill the placeholders in eas.json first
    eas submit -p android --profile production    # needs google-service-account.json; first upload to the Internal track

- [ ] iOS: appears in TestFlight after processing. Test it there, complete the App Store listing, **Submit for Review**.
- [ ] Android: test on the Internal track, then Closed testing (if required), then Production. Google's first review can take several days.
- [ ] Keep the first release's **release notes** short and factual.

## 10. After launch
- [ ] Watch crashes and ratings in the first week. Reply to reviews.
- [ ] A new store build is needed for any native change (new permission, new native package). JavaScript-only fixes can ship faster if you later add `expo-updates`.
- [ ] Bump `version` in `app.json` for each public release (build numbers increase automatically).
- [ ] Re-run `npm run preflight` before every release.
