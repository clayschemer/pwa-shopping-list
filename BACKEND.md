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

See `firebase/firestore.indexes.json`. Required composite indexes:

- `items` by `accountId` + `removed` (for `fetchActiveList`)
- `sessions` by `accountId` + `completedAt` (for `fetchActiveSessions`)

---

## Future Backend (placeholder)

When the Firebase backend is replaced, only `frontend/src/app/core/api/` changes. No component, store, effect, or test changes.

The likely replacement is a Java or Go service backed by PostgreSQL with a true SSE endpoint. The SSE contract must satisfy the `EntityChangeBatch<T>` stream model described in `API-CONTRACT.md §4`.

`future/README.md` tracks candidate decisions for that implementation when the time comes.

---

## Open Backend Decisions

| #   | Topic                                      | Status                                                              |
| --- | ------------------------------------------ | ------------------------------------------------------------------- |
| 1   | Firestore security rules — full rule set   | To be written during implementation                                 |
| 2   | Allowlist management                       | Hardcoded Firestore documents for now; admin tooling TBD            |
| 3   | First-write-wins on concurrent checks      | Implemented via Firestore transaction in `checkItem` service method |
| 4   | `purchaseCount` increment on session close | Implemented via Firestore batch write in `closeSession`             |
| 5   | Future backend language/framework          | Java or Go + PostgreSQL. Decision deferred.                         |
