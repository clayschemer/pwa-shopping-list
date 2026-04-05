# CLAUDE.md — Shared Shopping List PWA

This is the persistent project context for Claude Code. Read this at the start of every session.

**Also read at session start:** `DESIGN.md`, `DATA-MODEL.md`, `API-CONTRACT.md`, `PLANNING.md`.
Note: `design-system.scss` contains all design tokens (colours, typography, spacing, motion contract).

---

## Persona

You are an expert senior/staff software engineer with deep experience in both frontend and backend architecture. Approach all tasks with this expertise — provide professional-grade solutions, call out architectural tradeoffs, and don't over-explain basics. Favour conciseness over verbosity. Write production-quality code from the start. When design decisions have tradeoffs, name them explicitly rather than silently picking one.

---

## Model

Use **`claude-opus-4-6`** for all API calls in this project.

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
- **Framework:** Angular 21 (standalone components, pure SPA, no SSR) — upgrade to Angular 22 expected May 2026
- **Forms:** Signal Forms — experimental in Angular 21, expected stable in Angular 22. Use when stable; fall back to Reactive Forms until then.
- **State:** NgRx (store, effects, selectors)
- **UI:** Angular Material 3
- **PWA:** Offline support is nice-to-have, not a hard requirement
- **Fonts:** DM Serif Display + Plus Jakarta Sans (Google Fonts)

### Testing
- **Acceptance tests:** Cucumber.js with Gherkin `.feature` files
- **Unit and component tests:** Vitest
- **E2E (future):** Playwright (not in current scope)
- **Style:** David Farley — tests describe observable system behaviour, no implementation detail

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
├── design-system.scss               ← all design tokens, typography, motion contract
│
├── frontend/                        ← Angular PWA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── api/             ← API service layer (the only place that touches backend)
│   │   │   │   │   ├── shopping-list.service.ts   ← implements API-CONTRACT.md
│   │   │   │   │   └── firebase/    ← Firebase implementation of service layer
│   │   │   │   ├── auth/
│   │   │   │   └── store/           ← NgRx store, actions, reducers, effects, selectors
│   │   │   ├── features/
│   │   │   │   ├── plan-mode/
│   │   │   │   ├── shop-mode/
│   │   │   │   ├── settings/
│   │   │   │   └── auth/
│   │   │   └── shared/              ← shared components, pipes, directives
│   │   ├── assets/
│   │   └── styles/                  ← design-system.scss + Angular Material theme
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
    ├── BACKEND.md                   ← backend specification and decisions
    ├── firebase/                    ← Firebase project config, rules, indexes
    │   ├── firestore.rules
    │   ├── firestore.indexes.json
    │   └── firebase.json
    └── future/                      ← placeholder for future Java/Go + PostgreSQL implementation
        └── README.md
```

**Key rule:** Nothing outside `frontend/src/app/core/api/` may import from or reference any backend SDK directly. All backend interaction flows through the service layer that implements `API-CONTRACT.md`.

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
- **Undo on check is client-side only.** 4-second window. No API call until window expires. Visible only to the checking user.
- **Single price field on Item.** Last writer wins (user or AI). Staleness by `priceUpdatedAt` alone.
- **AI gated by `AiConfig`.** Service layer enforces the gate — components never check this directly.
- **`purchaseCount` incremented on session close** for all items in `checkedItems`. Drives autocomplete ranking.
- **Category order per-shop with global fallback.** Drawer reorder → `setShopCategoryOrder`. Global order → `setGlobalCategoryOrder`.
- **Nav drawer "Add category"** → `addCategory` API call. Backend auto-appends to all shops' `categoryOrder`.
- **Nav drawer reorder** → single `setShopCategoryOrder` write on drag release, not on every move.
- **Settings in `localStorage`**, not backend. Except AI auto-add which is account-level (`toggleAiAutoAdd`).
- **Session auto-start** on shop selection orchestrated by NgRx effect → `startSession`.
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

## First Tasks for Claude Code

1. Scaffold project structure (`frontend/` + `backend/`) as defined above
2. Install and configure: NgRx, Angular Material 3, Cucumber.js, Vitest
3. Generate all feature files from `PLANNING.md`
4. Implement Firebase backend behind the API service layer
5. Implement auth feature (Google OAuth) — test-first

---

## Planned Scope (not yet specced — do not implement)

- Signup / invitation flow for general availability
- AI provider configuration UI (S4 link — TBD design pass)
- Broader AI analytics (basket analysis, spend trends, price drift, co-occurrence)
- Barcode scanning
- Shop → plan mode transition with active session (open design question)
