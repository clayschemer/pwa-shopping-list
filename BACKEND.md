# BACKEND.md — Shared Shopping List PWA

This document covers backend architecture decisions and implementation notes.
The full API contract (entity types, stream contract, operations) lives in `API-CONTRACT.md` at the project root.

---

## Current Backend: Firebase

### Services in use

- **Firestore** — primary data store. All shared data (items, categories, shops, sessions, accounts, users) lives here.
- **Firebase Auth** — Google OAuth sign-in. UID tied to account membership.
- **Firebase Hosting** — static PWA hosting.

### Access control

Permitted users are defined by an allowlist stored in Firestore (email or uid). This is not a general signup flow. The client performs `getAccount()` after auth; a missing account record surfaces as `AccessDeniedError`.

### Realtime

Firestore `onSnapshot` listeners on each collection act as the SSE equivalent. The Angular service layer wraps these in typed `Observable<EntityChangeBatch<T>>` streams as defined in `API-CONTRACT.md §4`. The app cannot distinguish Firebase from a future SSE implementation.

### Firestore collection structure (implementation detail — not part of the API contract)

```
accounts/{accountId}
  users/{userId}
  shops/{shopId}
  categories/{categoryId}
  items/{itemId}
  sessions/{sessionId}
```

All collections are scoped under `accounts/{accountId}`. Firestore security rules enforce that authenticated users may only read/write documents within their own account.

### Firestore security rules

See `firebase/firestore.rules`. Key invariants:

- Read/write requires authenticated UID that matches a `users/{userId}` document within the account
- `items` may not be hard-deleted (enforced at service layer, not Firestore rules — rules allow delete but the service layer never calls it)
- Session writes are scoped to the authenticated user (checked via `request.auth.uid`)

### Indexes

See `backend/firebase/firestore.indexes.json`. The current schema uses subcollection queries (single-field `where`) that are served by Firestore's automatic indexes — no composite indexes are required.

---

## Manual seeding (Firebase console)

The app expects an account document, an allowlist entry per permitted user, and a member roster mirror. Until admin tooling exists, seed manually in the Firebase console.

For each new account/user pair:

1. **Allowlist entry** — `users/{uid}` with shape:
   ```
   { accountId: "<account-id>", email: "user@example.com" }
   ```
   The Firebase Auth UID is the document ID.

2. **Account document** — `accounts/{accountId}` with shape:
   ```
   { name: "Household", aiConfig: null }
   ```

3. **Member mirror** — `accounts/{accountId}/users/{uid}` with shape:
   ```
   { email: "user@example.com", displayName: "User Name" }
   ```
   The client writes this on first sign-in (best-effort), but seeding it ensures the shared roster is visible to other members immediately.

No categories, shops, or items need to be pre-seeded — those are created in the app.

---

## Deployment

Production deploys are driven by `.github/workflows/deploy.yml` — see `.github/workflows/DEPLOYMENT.md` for the full setup, secrets, and caveats. Summary:

- Push or PR to `develop` / `main` → Vitest + Cucumber run in CI (red tests block deploys).
- `develop` → builds with `--base-href "/<repo>/"` and deploys to **GitHub Pages**.
- `main` → builds and deploys to **cPanel via FTPS** (gated by the `production` environment).

Firestore rules and indexes are **not** part of the workflow. Deploy them manually from `backend/firebase/` whenever they change:

```bash
cd backend/firebase
npx firebase use --add        # one-time: writes .firebaserc
npx firebase deploy --only firestore:rules,firestore:indexes
```

Firebase Hosting is configured in `firebase.json` (with correct cache headers for `ngsw-worker.js`, `ngsw.json`, `manifest.webmanifest`, and `index.html`) but is not the active deploy target. It is kept as a fallback path and for `firebase emulators:start --only hosting` during local development.

### Local emulators

```bash
cd backend/firebase
firebase emulators:start
```

Auth: `http://127.0.0.1:9099` · Firestore: `127.0.0.1:8080` · Hosting: `http://localhost:5000` · UI: `http://127.0.0.1:4000`

To make the dev app target the emulators, set `window.__SHOP_USE_EMULATORS__ = true` from the browser console (or before bootstrap) while running on `localhost`. See `frontend/src/app/app.config.ts`.

---

## Future Backend (placeholder)

When the Firebase backend is replaced, only `frontend/src/app/core/api/` changes. No component, store, effect, or test changes.

The likely replacement is a Java or Go service backed by PostgreSQL with a true SSE endpoint. The SSE contract must satisfy the `EntityChangeBatch<T>` stream model described in `API-CONTRACT.md §4`.

`future/README.md` tracks candidate decisions for that implementation when the time comes.

---

## Open Backend Decisions

| #   | Topic                                      | Status                                                              |
| --- | ------------------------------------------ | ------------------------------------------------------------------- |
| 1   | Firestore security rules — full rule set   | Implemented in `backend/firebase/firestore.rules` via `isMember()` check on every subcollection read/write |
| 2   | Allowlist management                       | Hardcoded Firestore documents for now; admin tooling TBD            |
| 3   | First-write-wins on concurrent checks      | Implemented via Firestore transaction in `checkItem` service method |
| 4   | `purchaseCount` increment on session close | Implemented via Firestore batch write in `closeSession`             |
| 5   | Future backend language/framework          | Java or Go + PostgreSQL. Decision deferred.                         |
