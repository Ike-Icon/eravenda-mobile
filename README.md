# EraVenda Mobile (Expo + React Native + TypeScript)

Native client for the existing EraVenda FastAPI backend (`/api/*`). No new backend is needed.

## Install and run (Expo SDK 58)

This app includes native Google Sign-In. Install it in an Expo development build; Expo Go does not contain the `RNGoogleSignin` native module and will fail at runtime.

1. Install dependencies: `npm install`.
2. Set `.env` values for `EXPO_PUBLIC_API_URL` (your HTTPS API URL ending in `/api`), the Google client IDs, and `GOOGLE_IOS_URL_SCHEME` for iOS.
3. Build and install on the iOS Simulator (Mac with Xcode): `npx expo run:ios`.
   For Android, start an emulator or connect a USB-debugging-enabled device, then run: `npx expo run:android`.
4. For later JavaScript-only sessions, start the development server with `npx expo start --dev-client` and open EraVenda on the installed development build.

To make an installable Android APK for a device or tester, configure the API URL in the EAS `preview` profile and run `eas build --platform android --profile preview`. Open the completed build link on the phone and install the APK. iOS internal builds require Apple signing and registered test devices; see `docs/RELEASE_CHECKLIST.md`.

## Phase 1
Auth (login, signup, forgot password) · Home feed · Product details · Cart · Wishlist toggle · Account.

## Phase 2 (this drop)
Buyer: Checkout (saved addresses, delivery quote, pickup, Paystack or pay-on-delivery) · Orders list with Pay now/Cancel ·
Order tracking (Placed → Processing → Dispatched → Delivered, refreshed every 15 s) · Addresses · Wishlist · Account settings.
Seller (tab appears when `user.role === 'seller'`): dashboard with estimated earnings · products (add/edit/delete, variants: colours, sizes, priced options, Cloudinary photo upload, mark out of stock) ·
incoming orders (accept, ship with tracking, deliver, cancel).

## Phase 3
Sell on EraVenda (store application, status, edit logo/banner/details) · product reviews from delivered orders · rating summary on the product page.

## Phase 4
Store page (profile, follower count, Follow/Unfollow, product grid) opened from "Sold by" on the product page.
The store's product list needs the tiny backend change in `backend-patch/` (a `store_id` filter on `GET /api/products`); until then the app shows a notice.

## Phase 5
**Push notifications** (needs the server patch in `backend-patch/`): the phone registers after sign-in; buyers are notified when a payment is confirmed or a seller moves an order to processing, dispatched, delivered or cancelled; sellers when a new pay-on-delivery order arrives, an online order is paid, or a buyer cancels. Tapping a notification opens that order.
Setup: run `npx eas init` (puts a project id in `app.json` under `extra.eas.projectId`), then build a development build (`eas build --profile development`). Remote push does not work in Expo Go on Android and not on simulators.
**Wholesale ordering**: Retail / Wholesale switch on Home, wholesale badge and minimum on cards, product page starts at the seller's minimum with a running total, the cart flags products below minimum (counted across colour/size/option lines) with an "Add N more" button, wholesale and retail ship as separate orders, and sellers can mark a product wholesale with a minimum (2 or more) and a per-unit price.

## Phase 6
**One Notifications screen** (Account > Notifications) controls push and email for order updates (and seller alerts for stores). Status emails are new on the server; payment confirmations and receipts stay always-on.
**Release kit:** `eas.json` profiles (development, development-simulator, preview, production), generated icons and Play graphics (`npm run icons`), `npm run preflight`, and `docs/RELEASE_CHECKLIST.md` + `docs/STORE_LISTING.md`.

## Phase 7
**In-app account deletion** (Account > Delete account): explains what is deleted and kept, shows plain-language reasons when deletion isn't possible yet (open orders, unfinished bookings, store orders or payouts in progress), asks for the password and the word DELETE, then signs out. The server anonymises the account and keeps legally required order records; see `backend-patch/README.md` (section 2). The server patch also adds a public `/delete-account` web page for Google Play.

## Phase 8
**Report and block** (required for apps with user-generated content): "Report this listing" on product pages and "Report store" / "Block store" on store pages; reasons list, optional details, and an offer to hide the store after reporting. Blocked stores are filtered from Home and search and managed in Account > Blocked stores. Sign-up now shows the Terms (no objectionable content) and Privacy notice. Admins get an email per report and resolve it at `/admin/reports.html` (hide product, suspend store, clear review comment). Needs the server patch.

## Phase 9
**Top bar** with the EraVenda logo (tap = Home), wishlist and a cart button with a badge, above every tab. **Footer fixes:** the shared `Screen` now respects the bottom safe area, the tab bar no longer fights the home-indicator inset, and Checkout's pinned footer clears it.
**Google sign-in** on the Login and Sign-up screens, using the website's server route. Configure the Google client IDs in `.env`, then follow `docs/SOCIAL_LOGIN_SETUP.md`. Native sign-in needs a development build (not Expo Go).

## Known limits
- Password reset completes on the website (the emailed link opens your site).
- Checkout may need a verified email (only if your server sets REQUIRE_VERIFIED_EMAIL=true). The app shows a banner with a resend button.
- A new store is approved by an admin on the server; the Seller tab appears after approval (the app refreshes the account role when you open My store).
- Earnings are computed on the device from orders; they are an overview, not an accounting ledger.
- Paystack opens in the in-app browser and the app then asks the server to verify. Test with Paystack test keys first.
