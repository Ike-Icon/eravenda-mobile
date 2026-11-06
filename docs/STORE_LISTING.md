# EraVenda: store listing drafts

Draft copy written from what the app actually does. Edit anything that is not true for your business (delivery coverage,
seller checks, supported payment methods). Character counts were checked against the stores' limits at the time of writing;
re-check in each console.

## 1. Basics
| Field | Value |
|---|---|
| App name | EraVenda |
| Category (primary) | Shopping |
| Price | Free |
| Support email | `TODO: your support address` |
| Support URL | `TODO: https://eravenda.com/contact` |
| Privacy policy URL | `TODO: public URL` |
| Marketing URL (optional) | `TODO: https://eravenda.com` |
| Copyright | `TODO: (c) 2026 Your Company Name` |

## 2. Apple App Store
| Field | Limit | Text | Chars |
|---|---|---|---|
| Name | 30 | EraVenda | 8 |
| Subtitle | 30 | Buy & sell with local vendors | 29 |
| Promotional text | 170 | Shop from local vendors across Ghana, pay with mobile money or card, and follow every order from payment to delivery. | 117 |
| Keywords | 100 | marketplace,ghana,shop,vendors,wholesale,mobile money,paystack,online shopping,sell,store,orders | 96 |

## 3. Google Play
| Field | Limit | Text | Chars |
|---|---|---|---|
| Title | 30 | EraVenda: Shop Local Vendors | 28 |
| Short description | 80 | Shop from local vendors across Ghana. Pay securely and track every order. | 73 |

## 4. Full description (both stores, limit 4000)
EraVenda is a marketplace that connects local vendors with buyers across Ghana.

SHOP WITH CONFIDENCE
- Browse retail products or switch to wholesale for bulk prices and minimum order quantities.
- Search with suggestions as you type and filter by category.
- See prices, discounts, stock, ratings and the vendor behind every product.
- Choose colours, sizes and options, and save favourites to your wishlist.

CHECK OUT YOUR WAY
- Save delivery addresses and see your delivery fee before you pay.
- Pay with mobile money or card through Paystack, or choose pay on delivery where the seller allows it.
- Wholesale and retail items are delivered as separate orders, each with its own tracking.

FOLLOW YOUR ORDER
- Track every order from placed to processing, dispatched and delivered.
- Get notifications and emails when your order moves, and choose which ones you want in Account > Notifications.
- Rate what you bought once it arrives.

SELL ON ERAVENDA
- Apply for a store right from the app. New stores are reviewed before they go live.
- Add products with photos, colour, size and option variants, retail or wholesale pricing, and stock.
- Manage incoming orders, mark them as shipped with tracking details, and see your estimated earnings.
- Get a notification the moment a new order or payment arrives.

Follow your favourite stores, keep your addresses ready, and shop and sell from one app.

## 5. Screenshot shot list (capture 6 to 8, same order on both stores)
1. Home with the banner, categories and product grid.
2. Wholesale view of Home with the "Wholesale" badges.
3. A product page showing price, stock, vendor and variant choices.
4. Cart showing a wholesale minimum fix ("Add N more").
5. Checkout with address, delivery fee and payment choice.
6. Order tracking with the four-step tracker.
7. Notifications settings (push and email switches).
8. Seller dashboard or the add-product screen.

Capture from a real device or simulator with realistic, non-offensive test data and no personal customer details. Resize to the exact sizes the consoles list.

## 6. Privacy answers (Apple "App Privacy", Google "Data safety")
Answer from what the app and your server really do; this table is a starting point, not legal advice.

| Data | Collected? | Why | Linked to the user? |
|---|---|---|---|
| Name, email, phone | Yes | Account, order contact, support | Yes |
| Google or Apple account identifier and email (if the person signs in that way) | Yes | Sign-in | Yes |
| Delivery addresses | Yes | Delivering orders | Yes |
| Purchase history | Yes | Orders, receipts, seller fulfilment | Yes |
| Photos (only ones the user picks) | Yes, sellers | Product and store pictures | Yes |
| Reviews and store descriptions | Yes | Public marketplace content | Yes |
| Reports you file about content, and stores you block | Yes | Moderation and safety | Yes |
| Push token / device identifier | Yes | Order notifications | Yes |
| Payment card or mobile-money details | **No** (entered on Paystack's page) | n/a | n/a |
| Location | No (addresses are typed, not read from GPS) | n/a | n/a |
| Advertising or tracking | No | n/a | n/a |

- Data is encrypted in transit (HTTPS).
- Account deletion: users can delete their account in the app (Account > Delete account) or follow the steps at `https://YOUR-SITE/delete-account` (use this URL in Google's Data safety form). Personal data is removed; order and payment records are kept without personal identifiers for the period the law requires.

## 7. Notes for app reviewers (paste into review notes)
EraVenda is a marketplace for physical goods sold by third-party vendors in Ghana. Payments for physical goods are processed by Paystack, not by in-app purchase.

Test accounts (email confirmed):
- Buyer: `TODO email` / `TODO password`
- Seller (store approved): `TODO email` / `TODO password`

How to test: sign in as the buyer, add any product to the cart, and check out. Choose "Pay on delivery" to place an order without payment, or use Paystack test details `TODO: only if the review build points at a Paystack test-mode server`. Sign in as the seller to accept and ship the order; the buyer's tracker updates.

Account deletion: Account > Delete account (needs the password and typing DELETE). It is refused while an order is still in progress, so test it with a fresh buyer account.

Content moderation: new stores and products are reviewed by an admin before they appear. Any signed-in user can report a product or store (Product page: "Report this listing"; Store page: "Report store") and can block a store (Store page: "Block store"; manage under Account > Blocked stores). Each report emails our moderation team and is reviewed in an admin queue; we remove content and suspend stores that break our Terms, which ban objectionable content and are shown at sign-up. Contact: `TODO: support email`. Response time: `TODO: e.g. within 24 hours`.

## 8. What's new (first release)
Welcome to EraVenda: shop retail and wholesale from local vendors, pay securely, and follow your orders.
