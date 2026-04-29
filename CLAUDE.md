# CLAUDE.md — Shared Shopping List PWA

This is the persistent project context for Claude Code. Read this at the start of every session.

**Also read at session start:** `DESIGN.md`, `DATA-MODEL.md`, `API-CONTRACT.md`, `PLANNING.md`.

---

## Persona

You are an expert senior/staff software engineer with deep experience in both frontend and backend architecture. Approach all tasks with this expertise — provide professional-grade solutions, call out architectural tradeoffs, and don't over-explain basics. Favour conciseness over verbosity. Write production-quality code from the start. When design decisions have tradeoffs, name them explicitly rather than silently picking one.

---

## Model

Use **`claude-opus-4-6`** for all API calls in this project.

---

## Skills

Three project skills are active. Load them when working in their domains:

| Skill | File | When to load |
|---|---|---|
| `angular` | `.claude/skills/angular/SKILL.md` | Any Angular code — components, services, store, effects, guards, pipes, tests, architecture decisions |
| `angular-material3-theming` | `.claude/skills/angular-material3-theming/SKILL.md` | Theming, design tokens, Material component styling, dark/light/high-contrast/compact modes |
| `scss-conventions` | `.claude/skills/scss-conventions/SKILL.md` | Any SCSS or CSS work in the frontend |

---

## What This App Is

A shared shopping list PWA for two users (a couple). Private by default, may open to wider availability in future. Built mobile-first, accessibility-first, spec-driven. Architecture must support multi-user expansion without structural changes — registration/invitation flows are not yet built but the model assumes they will be.

---

## Core Principles

- **TDD and BDD first** — no feature is built without a failing test. Acceptance tests are written in Gherkin and drive development. Unit and component tests use Vitest.
- **Spec-driven** — feature files in `frontend/tests/acceptance/features/` are the source of truth for behaviour. When in doubt, refer to the feature file.
- **Technology-agnostic specs** — Gherkin scenarios describe *what* the system does, never *how* the user interacts with it. No UI assumptions in feature files. Style follows David Farley.
- **Backend abstraction** — the Angular app communicates with the backend exclusively through a dedicated API service layer. No component, store effect, or test touches Firebase or any backend directly. Swapping the backend means replacing service classes only — zero component changes.
- **Model agnosticism** — the logical data model is expressed in terms of entities, relationships, and rules. Nothing assumes Firestore, PostgreSQL, or any specific storage technology.
- **Accessibility by default** — all settings (dark mode, high contrast, reduced motion) respect device preferences unless explicitly overridden.
- **AI is optional** — all AI features are inactive unless an AI provider is configured on the account. The app is fully functional without AI.

---

## Tech Stack

### Frontend
- **Framework:** Angular 21 SPA (standalone components, no SSR) — Angular 22 upgrade expected May 2026
- **Fonts:** DM Serif Display + Plus Jakarta Sans (Google Fonts)
- **PWA:** Offline support is nice-to-have, not a hard requirement
- **Animations:** Pure CSS only (`transition`, `@keyframes`). **Do not** use `@angular/animations` — it is deprecated. Never install or import `@angular/animations`, `BrowserAnimationsModule`, or `NoopAnimationsModule`.
- **i18n:** Runtime language switching via `@jsverse/transloco`. Translation JSON files in `frontend/public/assets/i18n/{en,no,sv,de,fr}.json`. All user-facing strings must use the `transloco` pipe in templates or `TranslocoService.translate()` in TS. `ThemeService.language` drives `TranslocoService.setActiveLang()`.
- **Theming:** `_theme-colors.scss` is generated via `ng generate @angular/material:m3-theme` (or Material Theme Builder at `material-foundation.github.io/material-theme-builder`). To swap themes, replace `_theme-colors.scss` with builder output — the structure is identical. High-contrast themes are full M3 palette overrides (light+dark) generated with `--include-high-contrast`.
- **Compact mode:** Beyond `mat.all-component-densities(-2)`, compact mode overrides CSS custom properties (`--app-spacing-*`, `--app-line-height-*`, `--app-font-size-*`) to reduce all vertical spacing, line heights, and font sizes. All component SCSS should use these tokens for spacing.

For Angular component patterns, NgRx structure, service design, Signal Forms, routing, and testing conventions → `.claude/skills/angular/SKILL.md`
For Material 3 theming, design tokens, dark/light/high-contrast/compact mode setup → `.claude/skills/angular-material3-theming/SKILL.md`
For SCSS conventions (BEM, units, layout, accessibility, reduced motion) → `.claude/skills/scss-conventions/SKILL.md`

### Testing
- **Acceptance tests:** Cucumber.js with Gherkin `.feature` files — scenarios describe observable behaviour only, no UI assumptions (David Farley style)
- **Unit and component tests:** Vitest — see `.claude/skills/angular/SKILL.md` for conventions
- **E2E (future):** Playwright (not in current scope)

### Backend (current — Firebase)
- Firestore for data persistence
- Firebase Auth for Google OAuth
- Firebase Hosting for deployment
- Realtime updates via Firestore `onSnapshot` (acting as SSE equivalent)
- Permitted users defined by an email/uid allowlist in Firestore — not a general signup flow

### Backend (future — abstracted)
- Likely Java or Go + PostgreSQL with a true SSE endpoint
- The Angular API service layer is the only thing that changes on a backend swap
- The `backend/` directory exists now as a placeholder and home for the Firebase project config and any backend specification documents

### Auth
- Google OAuth via Firebase Auth
- Allowlist-based access control (email or uid stored in Firestore)
- Sessions persist on the same device unless explicitly signed out, cache cleared, or new device

---

## Project Structure

```
/
├── CLAUDE.md                        ← this file; read at every session start
├── PLANNING.md                      ← features, scenarios, architecture decisions
├── DATA-MODEL.md                    ← full logical data model (backend-agnostic)
├── API-CONTRACT.md                  ← full service layer contract (TypeScript types + operations)
├── DESIGN.md                        ← UI/UX specification (all 6 screens signed off)
├── BACKEND.md                       ← backend specification and decisions
├── FUTURE-FEATURES.md               ← deferred Gherkin scenarios (barcode scanning, etc.)
├── design-system.scss               ← all design tokens, typography, motion contract
│
├── frontend/                        ← Angular PWA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── api/             ← API service layer — the ONLY place that touches backend
│   │   │   │   │   ├── item-api.service.ts
│   │   │   │   │   ├── category-api.service.ts
│   │   │   │   │   ├── shop-api.service.ts
│   │   │   │   │   ├── session-api.service.ts
│   │   │   │   │   └── account-api.service.ts
│   │   │   │   ├── auth/            ← Firebase auth bridge + auth guard
│   │   │   │   ├── format/          ← MoneyPipe (currency formatting from ThemeService)
│   │   │   │   ├── i18n/            ← Transloco config and HTTP loader
│   │   │   │   └── theme/           ← ThemeService — manages settings in localStorage, applies CSS classes
│   │   │   ├── store/               ← NgRx per-domain
│   │   │   │   ├── account/
│   │   │   │   ├── categories/
│   │   │   │   ├── items/
│   │   │   │   ├── sessions/
│   │   │   │   ├── shops/
│   │   │   │   ├── ui/
│   │   │   │   └── selectors/       ← cross-domain selectors (grouped lists, etc.)
│   │   │   ├── shell/               ← app-shell components (nav drawer, etc.)
│   │   │   ├── features/
│   │   │   │   ├── auth/            ← sign-in + access-denied
│   │   │   │   ├── plan/            ← plan-mode list, add-pill, item edit sheet, remove dialog
│   │   │   │   ├── shop/            ← shop-mode list, shop-select sheet, undo-history, close-session dialog
│   │   │   │   ├── categories/      ← category name sheet, available-in-shops sheet, delete dialog
│   │   │   │   ├── manage-shops/    ← Manage Shops screen + shop name sheet
│   │   │   │   └── settings/
│   │   │   ├── models/              ← domain types (*.model.ts)
│   │   │   ├── app.config.ts
│   │   │   ├── app.routes.ts
│   │   │   └── app.{ts,html,scss}   ← root component
│   │   ├── styles/                  ← Angular Material theme + skeleton mixin
│   │   └── testing/                 ← shared test helpers (init-testbed, transloco-testing)
│   ├── tests/
│   │   └── acceptance/
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── modes/
│   │       │   ├── settings/
│   │       │   ├── categories/
│   │       │   ├── shops/
│   │       │   ├── items/
│   │       │   ├── sessions/
│   │       │   ├── ai-price-estimation/
│   │       │   ├── ai-list-suggestions/
│   │       │   ├── autocomplete/
│   │       │   └── barcode-scanning/
│   │       └── step-definitions/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
└── backend/                         ← backend project root
    ├── firebase/                    ← Firebase project config, rules, indexes
    │   ├── firestore.rules
    │   ├── firestore.indexes.json
    │   └── firebase.json
    └── future/                      ← placeholder for future Java/Go + PostgreSQL implementation
        └── README.md
```

**Key rule:** Nothing outside `frontend/src/app/core/api/` may import from or reference any backend SDK directly. All backend interaction flows through the service layer that implements `API-CONTRACT.md`.

For detailed Angular file and folder conventions → `.claude/skills/angular/SKILL.md`

---

## Application Modes

Two modes, switchable per user independently. Mode is **not persisted** — always starts in plan mode.

### Plan Mode (default)
- Full list management: add, edit, remove items; manage categories and shops
- Categories act as tags — appear only when at least one item is assigned
- Items displayed once, under primary category
- Global category order unless shop-specific order configured

### Shop Mode
- Optimised for active shopping
- Entering shop mode triggers shop selection → starts session automatically
- Items appear under all assigned categories (primary + secondary)
- Checking under any category marks item checked across all categories
- Two totals per category: Est. (all active unchecked) + session checked total

---

## Data Model Summary

Full model with design rationale in `DATA-MODEL.md`. Read it before working on any service layer, store, or backend code.

```
Account       { id, name, aiConfig: AiConfig | null }
AiConfig      { provider, apiKeyRef, priceLookupShopOrder: ShopId[], autoAddEnabled }
              // Note: apiKeyRef exists in the logical data model but is backend-internal.
              // It is intentionally absent from the API contract — the frontend never sees it.
User          { id, accountId, email, displayName }
Shop          { id, accountId, name, categoryOrder: CategoryId[] }
Category      { id, accountId, name, globalSortOrder }
Item          { id, accountId, name, quantity, unit,
                primaryCategoryId, secondaryCategoryIds,
                removed, removedAt, addedBy, aiMotivation,
                price, priceQuantity, priceUnit, priceUpdatedAt,
                purchaseCount }
Session       { id, accountId, shopId, participants, startedBy,
                startedAt, completedAt, checkedItems: SessionCheckedItem[] }
SessionCheckedItem { itemId, checkedBy, checkedAt,
                     priceSnapshot, priceQuantitySnapshot, priceUnitSnapshot }
```

---

## Key Design Decisions (implementation-relevant)

- **Items never hard deleted.** `removed` flag is the only list-visibility control. Removed items persist for autocomplete and `purchaseCount` tracking.
- **`removed` set by two actors:** plan-mode deletion or session check. Cleared by uncheck. No separate checked/deleted distinction.
- **First-write-wins on concurrent checks.** Slower write receives `CheckConflictError`. UI shows inline message; item's updated state arrives via `itemChanges$`.
- **Session log is source of truth** for purchase history and totals. Price, qty, unit snapshotted at check time.
- **One active session per shop per account.** Users at the same shop share a session via start-or-join semantics. Users at different shops have independent sessions.
- **Undo on check has two layers.** 4-second pending window is client-side only (visible only to the checking user). Committed undo history (`session.checkedItems`) is shared — any participant can undo any check.
- **Single price field on Item.** Last writer wins (user or AI). Staleness by `priceUpdatedAt` alone.
- **AI gated by `AiConfig`.** Service layer enforces the gate — components never check this directly.
- **`purchaseCount` incremented on session close** for all items in `checkedItems`. Drives autocomplete ranking.
- **Category order per-shop with global fallback.** Drawer reorder → `setShopCategoryOrder`. Global order → `setGlobalCategoryOrder`.
- **Nav drawer "Add category"** → `addCategory` API call. Backend auto-appends to all shops' `categoryOrder`.
- **Nav drawer reorder** → single `setShopCategoryOrder` write on drag release, not on every move.
- **Settings in `localStorage`**, not backend. Except AI auto-add which is account-level (`toggleAiAutoAdd`).
- **Selected shop persisted per-user** on the account member doc (`selectedShopId`). Seeded on boot from `getAccount()`. Updated fire-and-forget on plan-mode shop change and shop-mode entry. Reset to null (global) on shop deletion.
- **Session auto-start/join** on shop selection orchestrated by NgRx effect → `startSession` (start-or-join semantics).
- **Mode (plan/shop)** is NgRx store state only. Not persisted. Not synced between users.

---

## API Service Layer Contract

Full contract with all types, error types, stream contract, and operations in `API-CONTRACT.md`. Key points:

- Service exposes typed `Observable` streams per entity (`itemChanges$`, `sessionChanges$`, etc.)
- Each stream emits `EntityChangeBatch<T>` — array of `EntityChange<T>` with `added | modified | removed`
- Operations return `Promise`. Write results arrive via streams, not return values (except where immediate reference is needed, e.g. `addItem` returns the created `Item`).
- Errors are typed discriminated union values, not thrown exceptions (for foreseeable outcomes)
- `streamError$` surfaces unrecoverable stream failures globally

### Bootup sequence
```
1. getAuthState()           → null: sign-in screen; User: continue
2. getAccount()             → seeds account + aiConfig
3. Promise.all([
     fetchActiveList(),
     fetchAllCategories(),
     fetchAllShops(),
     fetchActiveSessions()
   ])                       → seeds store
4. Subscribe to all change Observables + streamError$
```
No component or effect performs its own initial fetch.

---

## Settings

All device-local (localStorage) unless noted:

| Setting | Type | Default | Shared? |
|---|---|---|---|
| Language | Dropdown: EN, NO, SV, DE, FR | EN | No |
| Currency | Dropdown: GBP, USD, EUR, NOK, SEK, DKK | GBP | No |
| Dark mode | Toggle | System pref | No |
| High contrast | Toggle | System pref | No |
| Reduce motion | Toggle | System pref | No |
| Compact mode | Toggle | Off | No |
| Keep screen awake | Toggle | On | No |
| Left-handed mode | Toggle | Off | No |
| AI auto-add | Toggle | Off | **Yes — account-level** |

---

## Open Design Decisions

| # | Topic | Status |
|---|---|---|
| 1 | Shop → plan mode switch with active session | Open: modal or bottom sheet? |
| 2 | Price field granularity in edit sheet | Open: flat only, or qty+unit sub-fields? |
| 3 | AI provider setup screen | Open: needs own design pass |
| 4 | Shops reorderable in Manage Shops? | Open |
| 5 | Price staleness threshold | Working assumption 6–12 months |
| 6 | AI price lookup mechanics | Beyond shop priority order — TBD |
| 7 | AI suggestion motivation refresh | Existing motivation reused on re-suggestion; update deferred |

---

## Implementation Status

Built (test-first, behind the API service layer):

- Auth: Firebase Google OAuth, allowlist gate via `getAccount()`, sign-in / access-denied / pending-verification screens, route guard, session restore loading state. First-time Google sign-in self-registers a `/users/{uid}` doc with `verified: false` and routes to `/pending-verification`; admin flips `verified` and sets `accountId` in the Firebase console to grant access. Legacy docs without the `verified` field are treated as verified.
- App shell: top bar with mode toggle, nav drawer, full-screen routes for Settings / Manage Shops / History, runtime i18n + theme service + compact / high-contrast / left-handed / reduced-motion modes
- Items: store + plan-mode list, add-pill flow, edit sheet, remove confirm dialog
- Shops: store + Manage Shops screen with add / rename / delete sheets
- Categories: store + plan-mode header ⋯ menu (rename / available-in-shops / delete), nav-drawer drag reorder dispatches `setShopCategoryOrder` per shop or `setGlobalCategoryOrder` when "Global" is selected, add-category sheet from drawer
- Sessions + shop mode: session API + store, auto-start on shop select, shop-mode list with grouped Est. and session totals, 4 s client-side undo window, undo-history sheet, close-session dialog, 30-min inactivity reminder dialog (close session or keep shopping)
- Session history: `/history` route loads completed sessions via `fetchSessionHistory`, expansion panels show shop, completed-at, total, and per-item snapshots
- PWA shell: `@angular/service-worker` with `ngsw-config.json`, `manifest.webmanifest`, default icon set under `frontend/public/icons/`, hosting headers configured for SW + manifest in `backend/firebase/firebase.json`

Backend status: All API services (Auth, Item, Category, Shop, Session, Account, Users) are wired to Firestore through the `core/api/` layer. Each entity exposes a real `EntityChangeBatch<T>` stream via `snapshotChanges` (see `change-stream.ts`). `StreamErrorService` surfaces unrecoverable stream failures globally. Firestore security rules in `backend/firebase/firestore.rules` enforce the `accounts/{accountId}/...` subcollection layout via an `isMember()` check.

Deployment: GitHub Actions workflow (`.github/workflows/deploy.yml`) runs Vitest + Cucumber on every push/PR to `develop`/`main`, then deploys `develop` → GitHub Pages and `main` → cPanel via FTPS. Firestore rules and indexes deploy separately via `firebase deploy --only firestore:rules,firestore:indexes` from `backend/firebase/`. Firebase Hosting config exists in `firebase.json` as a fallback path but is not part of the active pipeline.

Acceptance: Gherkin `.feature` files under `frontend/tests/acceptance/features/` cover auth, modes, settings, categories, shops, items, sessions, autocomplete, AI price estimation, AI list suggestions, and barcode scanning. Step definitions are written for all non-AI / non-barcode features and pass.

---

## Planned Scope (not yet specced — do not implement)

- Signup / invitation flow for general availability
- AI provider configuration UI (S4 link — TBD design pass)
- Broader AI analytics (basket analysis, spend trends, price drift, co-occurrence)
- Barcode scanning
- Shop → plan mode transition with active session (open design question)
