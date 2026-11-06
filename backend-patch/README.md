# Server changes for the mobile app (one patch)

`eravenda-server-changes.patch` was generated against your `eravenda-market-secured-and-faster.zip` and applies cleanly to it.
It changes the **backend and two website pages**, so apply it from the project root (the folder that contains `backend/` and `frontend/`):

    cd eravenda-market
    patch -p1 < /path/to/eravenda-server-changes.patch

Then commit, push, and let Render redeploy. The new tables (`device_tokens`, `notification_preferences`) are created on startup
by your existing `Base.metadata.create_all()`. No manual migration is needed and no existing table is altered.

## 1. Push notifications and order emails
- `app/push.py` (new): sends pushes through Expo on a background thread. A failed push never breaks a request.
- `app/notifications.py` (new): decides who is told, through which channel, honouring preferences.
  - Buyer status changes (processing, dispatched, delivered, cancelled) -> push and/or email.
  - Payment confirmed -> push to buyer and seller (your existing payment emails are unchanged).
  - New pay-on-delivery order / buyer cancellation -> push to the seller.
- `app/routers/devices.py` (new): `POST /api/devices`, `POST /api/devices/unregister`.
- `app/routers/notification_preferences.py` (new): `GET/PUT /api/users/me/notification-preferences`.
- `app/models.py`: `DeviceToken` and `NotificationPreference` tables. `orders.py` and `payments.py` call `notifications.*`.

| Preference (default ON) | Who | Controls |
|---|---|---|
| `order_updates_email` | buyer | status emails |
| `order_updates_push` | buyer | status and payment pushes |
| `seller_orders_push` | seller | new order, payment and cancellation pushes |

Existing transactional emails (payment confirmation, receipts, the seller's sale email) are NOT affected by these settings.

## 2. In-app account deletion
Required by Apple and Google for apps that allow sign-up.
- `GET /api/users/me/deletion-check` -> `{can_delete, blockers[], requires_password}`
- `POST /api/users/me/delete` with `{"confirm": "DELETE", "password": "..."}` (rate-limited; password only when the account has one)
- `app/account_deletion.py`: the rules. `app/routers/account_deletion.py`: the endpoints.
- `frontend/templates/delete-account.html` + the `/delete-account` route in `main.py`: a public page that explains how to delete an account and what happens to data. Google Play's Data safety form asks for exactly this kind of web link. `privacy.html` now links to it.

**It anonymises instead of hard-deleting.** Orders point at the buyer, the store and the delivery address, payments point at orders, and your
privacy policy promises to keep transaction records (up to six years). Your admin "delete user" endpoint fails for the same reason.
After deletion:

| Removed | Anonymised | Kept |
|---|---|---|
| name, email, phone, password, sign-in links, photo, location; addresses not used by an order; cart; wishlist; store follows (follower counts recomputed); push tokens; notification preferences; newsletter and contact-form rows for that email; review comment text | addresses used by past orders (name, phone, street details blanked; region and city stay); the seller's store (renamed "Closed store", description/logo/banner/registration number removed, suspended); its products (hidden, stock 0) | the user row as "Deleted user" (inactive, cannot sign in), orders, order items, payments, receipts, payouts, review star ratings |

**Deletion is refused (with a plain-language reason) while:** an order of the user is pending, paid, processing or shipped; a service booking is unfinished;
the user's store has orders in progress or payouts pending or processing; or the account is an admin, delivery or professional-services profile
(those must go through support). A confirmation email goes to the original address afterwards.

Decisions you may want to change: keeping star ratings (comments are removed), keeping region/city on past order addresses, and hiding rather than deleting a seller's products.
Seller product photos stay on Cloudinary; deleting them needs your Cloudinary API secret and is not done here.

## 3a. Google and Apple sign-in from the phone
- `app/social_auth.py`: `GOOGLE_CLIENT_ID` and `APPLE_CLIENT_ID` may now hold several comma-separated ids (PyJWT accepts a list of audiences).
- Google needs **no** server change (the app signs in with the website's web client id as its server client), so keep `GOOGLE_CLIENT_ID` as is.
- Apple needs one: set `APPLE_CLIENT_ID=<website Services ID>,<iOS bundle id>` because native Apple sign-in puts the bundle id in the token.
- `tests/test_social_audiences.py`: unit test for the parser (passes with stubbed `httpx`/`jwt`; not run against the real libraries here).
- Full setup: `docs/SOCIAL_LOGIN_SETUP.md` in the app project.

## 3. Reporting and blocking (user-generated content)
Apple (guideline 1.2) and Google Play expect apps with user content to offer a way to report it, a way to block, published contact details,
and rules against objectionable content. Stores and products were already pre-moderated (they wait for admin approval); this adds the after-the-fact path.
- `POST /api/reports` `{target_type: product|store|review, target_id, reason, details?}`. Needs sign-in, 10 per hour. Refuses reports of your own content; reporting the same thing twice returns the first report. Every new report **emails `ADMIN_NOTIFICATION_EMAIL`** with a link to the queue.
- `GET/POST/DELETE /api/blocks/stores[/{id}]`: a buyer hides a store. The server keeps the list; the app filters those stores out of Home and search.
- `GET /api/admin/reports?status=open` and `PUT /api/admin/reports/{id}` (admin only): resolve a report and optionally act on it: `hide_product` (sets the product to rejected with a reason), `suspend_store`, or `clear_review_comment`.
- **Admin page:** `/admin/reports.html` (new `frontend/templates/admin/reports.html`, same login gate as your other admin pages). It is not linked from the dashboard; bookmark it, or add a link next to the Stats button.
- `terms.html` gains a "No objectionable content" paragraph that describes reporting and removal.
- New tables `content_reports` and `store_blocks` (created on startup). Reports keep pointing at the reporter's row after account deletion on purpose (moderation records); a deleted user's blocks are removed.
- Decide your response-time promise (many teams use 24 hours) and make sure someone watches the admin email address.

## 4. Store page filter
- `app/routers/products.py`: optional `store_id` filter on `GET /api/products` (used by the app's store page).

## Tests
- `tests/test_push.py`, `tests/test_notifications.py`: unit tests, no database or network.
- `tests/test_account_deletion.py`, `tests/test_moderation.py`: end-to-end, need a throwaway PostgreSQL like `tests/test_wholesale.py`.

## Verification status
- The patch applies cleanly to your original files; every changed Python file byte-compiles; both HTML templates render in Jinja.
- The six tests in `test_notifications.py` pass against the real module (run with stubbed dependencies, because the backend's packages are not installed in the authoring sandbox).
- `test_account_deletion.py` and `test_moderation.py` were written against your real routes and models but **have not been run**: run them before shipping, do one real deletion on a staging account, and file one real report and resolve it from `/admin/reports.html`.
- The admin page's script passes a JavaScript syntax check; it has not been clicked through in a browser.
- Nothing has been run against a live database, Resend, a browser or a phone.

Optional environment variables: `PUSH_NOTIFICATIONS_ENABLED=false` switches pushes off; `EXPO_ACCESS_TOKEN` if you enable enhanced push security in your Expo account.
