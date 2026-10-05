# 369 Mart — customer app

The 369 Mart website as a phone app (Expo / React Native), drawn from the
**369 Mart Storefront** design in `design/`.

## Run it

```
npm install
npx expo start            # demo data: no server needed
```

Open it in Expo Go, or press `w` for the browser preview.

### Against the real shop

The app talks to the website's own server routes (`/369mart/*` on Odoo). Name
the server when starting:

```
EXPO_PUBLIC_API_URL=http://<odoo-host>:<port> npx expo start
```

- `EXPO_PUBLIC_ODOO_DB` — only for a server that holds several databases.
- With no `EXPO_PUBLIC_API_URL` the app runs on demo data.
- Tablet on USB, server on this computer: `adb reverse tcp:8097 tcp:8097`, then
  use `http://localhost:8097`.

## Where things are

| Folder | What |
|---|---|
| `app/` | The screens (expo-router) |
| `src/ui/` | Shared pieces: header, product card, tab bar, cart bar |
| `src/theme/tokens.ts` | The design's colours and sizes, Quick and Express |
| `src/api/types.ts` | What the app knows about the shop |
| `src/api/rest/` | The real shop: `/369mart/*` |
| `src/api/mock/` | Demo data: the design's seven products |
| `src/store/` | Cart, Quick/Express mode, signed-in customer |
| `design/` | The HTML mockups the app is built from |
| `screenshots/` | Screens captured while testing |

## Checks

```
npm run typecheck
npm run lint
```

## What it does

Browse (Quick and Express), search, product pages with choices, cart priced by
the shop, checkout with rider instructions and WhatsApp updates, orders and
tracking, cancel, return or replace with photos, rate an order, reviews with
photos, invoice, replacement offers, My list, wallet, coupons and scratch cards,
refer and earn, points, notifications, saved UPI IDs, addresses with a map pin,
and the support chat.

## Waiting on the shop's server

Online payment (UPI / card) and so wallet top-up, the rider's live position,
OTP sign-in, and push notifications. The app shows only what the server gives.

## Building an installable app

The server address is fixed when the app is built, so it must be one the
phones can reach:

```
EXPO_PUBLIC_API_URL=https://<shop-server> npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```
