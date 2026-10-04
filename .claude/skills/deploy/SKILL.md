---
name: deploy
description: Deployment checklist for this Angular + Firebase + GH Pages PWA. Use whenever the change touches Firestore rules/indexes, GH Pages asset paths, the service worker / manifest, or any other deploy-adjacent surface. Also use when the user says "deploy", "push to prod", "smoke test the deploy", or reports a bug that only reproduces in production.
---

# /deploy — Deployment checklist

This stack has several deploy-time gotchas that have repeatedly blocked sessions. Walk through every applicable section before declaring a deploy done.

---

## Pipeline overview

- CI: `.github/workflows/deploy.yml` runs Vitest + Cucumber on every push/PR to `develop` and `main`.
- `develop` → **GitHub Pages** (served under a subpath, e.g. `/shopping-list/`).
- `main` → **cPanel** via FTPS.
- Firestore rules and indexes are **NOT** part of the CI pipeline. They deploy manually.
- Firebase Hosting config in `backend/firebase/firebase.json` exists as a fallback but is not active.

---

## 1. Firestore rules and indexes

If `backend/firebase/firestore.rules` or `backend/firebase/firestore.indexes.json` changed:

```bash
cd backend/firebase && firebase deploy --only firestore:rules,firestore:indexes
```

- Rules deploy **separately** from the app build. Forgetting this surfaces as "Missing or insufficient permissions" in prod while local emulation works.
- After deploy, check the Firebase console → Firestore → Rules timestamp to confirm.
- Index changes can take minutes to build; queries needing a new composite index will fail until it's ready. Monitor the Indexes tab.

## 2. GH Pages subpath

GH Pages serves the app under `/shopping-list/` (or whatever the repo path is), not the root.

- All asset references — i18n JSON, icons, manifest, service worker — must resolve relative to `baseHref`, not absolute `/...`.
- Verify the built `index.html` and any code that constructs asset URLs uses `<base href>` or runtime `document.baseURI`, not hard-coded leading slashes.
- A common failure mode: i18n JSON 404s in prod because the loader points to `/assets/i18n/...` instead of `assets/i18n/...`. The app renders untranslated keys instead of strings.

## 3. PWA / service worker

The service worker is **disabled on `ng serve`**. Anything PWA-related (install prompt, offline cache, update flow) only works against a production build.

- To smoke-test locally:

  ```bash
  cd frontend && npm run build && npx http-server dist/<app>/browser -p 4200
  ```

  Then open in a Chromium browser and check DevTools → Application → Service Workers.

- The install prompt appears only when install criteria are met: HTTPS (or localhost), valid `manifest.webmanifest`, registered SW, and the browser's engagement heuristics. "I don't see the button" on `ng serve` is expected, not a bug.

- After deploying a new SW version, existing users may take a refresh cycle to pick it up. `ngsw-config.json` controls cache strategies — review it when changing what gets cached.

## 4. Auth and allowlist

- Allowlist is enforced via Firestore docs at `/users/{uid}` with `verified: true` and an `accountId`. Legacy docs without `verified` are treated as verified.
- First-time Google sign-in self-registers a `/users/{uid}` with `verified: false` and routes to `/pending-verification`. Grant access by flipping `verified: true` and setting `accountId` in the Firebase console.
- After granting access, the user must reload — `authState` doesn't re-emit on a remote doc change.

## 5. Post-deploy smoke checks

After every deploy, in a fresh browser (or incognito) against the deployed URL:

1. Sign in with an allowlisted Google account — confirm route lands on the list, not `/access-denied` or `/pending-verification`.
2. Open DevTools → Network — confirm `assets/i18n/en.json` and the other locales load 200, not 404.
3. Switch languages — confirm strings update, no missing-key fallbacks.
4. Add an item, then check it in shop mode — confirm Firestore writes succeed (no "permission denied").
5. DevTools → Application → Service Workers — confirm the SW is `activated and is running` on the deployed origin.
6. Check the Firebase console → Firestore for any unexpected rules-rejection logs from the last few minutes.

If any check fails, do **not** declare the deploy done — diagnose and fix before moving on.

---

## When to invoke this skill proactively

- Any commit message containing "rules", "indexes", "manifest", "service worker", "baseHref", or "i18n loader".
- Any change to `backend/firebase/`, `frontend/ngsw-config.json`, `frontend/public/manifest.webmanifest`, or `frontend/angular.json` build config.
- Any prod-only bug report ("works locally, fails on the deployed site").
