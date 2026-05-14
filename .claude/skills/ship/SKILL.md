---
name: ship
description: Finalise a change before commit. Runs the full quality gate — i18n parity across all 5 locales, unit tests (Vitest), acceptance tests (Cucumber), and the production build — then proposes a conventional-commit message. Invoke whenever wrapping up a feature or bug fix, or whenever the user says "ship", "finalise", "ready to commit", or similar.
---

# /ship — Finalise a change

Use this skill when wrapping up any change before commit. Run the steps in order. Do not skip ahead on green-looking output — every step has caught real regressions.

---

## 1. i18n parity

Every user-facing string lives in **all five** translation files: `en.json`, `no.json`, `sv.json`, `de.json`, `fr.json` under `frontend/public/assets/i18n/`.

- Diff the keys across locales. Any key present in `en.json` but missing in any other locale is a regression — translate and add it.
- Quotes inside translation values must be escaped (`\"`). Unescaped quotes silently break the build (most often `de.json`).
- Validate JSON syntax explicitly:

```bash
for f in frontend/public/assets/i18n/*.json; do jq empty "$f" && echo "OK: $f" || echo "BAD: $f"; done
```

The `i18n-json` PostToolUse hook in `.claude/settings.local.json` runs this automatically on save; if it has been firing red, do **not** ship until it's clean.

## 2. Unit tests

```bash
cd frontend && npm test
```

- All Vitest specs must pass. Do not mark complete on partial passes.
- If a test was disabled or skipped during the change, re-enable it or document why in the commit body.
- Component tests that mount Transloco-dependent components require `provideTranslocoTesting()` — fix the test setup, don't strip translation usage.
- `jsdom` lacks `matchMedia`, ResizeObserver, `visualViewport`, and similar browser APIs. Stub them in `frontend/src/testing/` rather than disabling tests.

## 3. Acceptance tests

```bash
cd frontend && npm run test:acceptance
```

- All Gherkin scenarios under `frontend/tests/acceptance/features/` must pass.
- New behaviour must be backed by a scenario (David Farley style — describe observable behaviour, no UI assumptions).
- If a scenario was added but its step definitions are stubbed, the run will hang or skip — fail loudly rather than ship a green-looking partial.

## 4. Production build

```bash
cd frontend && npm run build
```

- TypeScript errors are blocking — no `// @ts-ignore` to get a green.
- SCSS errors are blocking — check `@use` paths are **relative**, not absolute.
- Watch the build output for asset-path warnings; GH Pages serves under a subpath and absolute `/...` references will 404 in prod even if the build passes.

## 5. Backend rules (if touched)

If this change modified `backend/firebase/firestore.rules` or `firestore.indexes.json`:

- Flag this in the commit message body.
- Remind the user that rules deploy separately:

```bash
cd backend/firebase && firebase deploy --only firestore:rules,firestore:indexes
```

This is **not** part of the GH Pages / cPanel CI pipeline. Forgetting it has bitten multiple sessions with "permission denied" errors in prod.

## 6. Commit

Once all gates are green, propose a single conventional-commit message. Examples in this repo's history (`git log --oneline -20`) for tone. Keep the subject under 72 chars; explain the *why* in the body if non-obvious.

Do **not** commit without the user's explicit go-ahead. Always show the proposed message first.

---

## Failure handling

If any step fails:

1. Stop. Do not proceed to later steps.
2. Diagnose the actual failure (read the full output, don't pattern-match on the first error line).
3. Fix the underlying cause. Do not delete the failing test, comment out the assertion, or weaken the contract to get green.
4. Re-run from the failed step.

Trace the runtime path on framework-level failures (route snapshots, async injection contexts, `visualViewport`, Firestore stream lifecycle). "Looks right" fixes have repeatedly missed the actual code path in this project.
