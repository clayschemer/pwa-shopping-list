# CLAUDE.md — Shared Shopping List PWA

This is the persistent project context for Claude Code. Read this at the start of every session.

---

## What This App Is

A shared shopping list PWA for two users (a couple). The app is private by default but may be opened to wider availability in the future. It is built mobile-first with accessibility as a core concern, not an afterthought.

---

## Core Principles

- **TDD and BDD first** — no feature is built without a failing test. Acceptance tests are written in Gherkin and drive development. Unit and component tests use Vitest.
- **Spec-driven** — feature files in `tests/acceptance/features/` are the source of truth for behaviour. When in doubt, refer to the feature file.
- **Technology-agnostic specs** — Gherkin scenarios describe *what* the system does, never *how* the user interacts with it. No UI assumptions in feature files.
- **Backend abstraction** — the Angular app communicates with the backend exclusively through a dedicated API service layer. No component or store effect touches Firebase or any backend directly. This ensures a seamless backend swap (e.g. Firebase → Java + PostgreSQL) without client-side changes.
- **Accessibility by default** — all settings (dark mode, high contrast, reduced motion, etc.) respect device preferences unless explicitly overridden by the user.

---

## Tech Stack

### Frontend
- Angular 21 (standalone components, pure SPA, no SSR)
- NgRx for state management
- Angular Material 3 for UI components
- PWA (offline support is a nice-to-have, not a hard requirement)

### Testing
- **Acceptance tests**: Cucumber.js with Gherkin `.feature` files
- **Unit and component tests**: Vitest
- **Style**: David Farley — tests describe observable system behaviour, no implementation detail

### Backend (current)
- Firebase (Firestore for data, Firebase Auth for Google OAuth, Firebase Hosting)
- Realtime updates via Firestore `onSnapshot` (acting as SSE equivalent until a dedicated backend is introduced)

### Backend (future — abstracted away from client)
- Likely Java + PostgreSQL with a true SSE endpoint
- The API service layer in Angular is the only thing that changes on a backend swap

### Auth
- Google OAuth via Firebase Auth
- Permitted users defined by an allowlist (email/uid) — expand to signup flow in future
- Sessions persist on the same device unless explicitly signed out, cache cleared, or accessing from a new device

---

## Application Modes

The app has two modes, switchable by the user. Modes are **independent per user** — one user can be in plan mode while the other is in shop mode.

### Plan Mode (default)
- Full list management: add, edit, remove items; manage categories and shops
- Categories act as tags — they appear in the list only when at least one item is assigned to them
- Items displayed once, under their primary category
- Global category order applies unless a shop-specific order is configured

### Shop Mode
- Visually optimised for active shopping — reduced cognitive load
- User selects a shop on entering shop mode (or proceeds without one, using global category order)
- Items appear under all assigned categories (primary + secondary)
- Checking an item under any category marks it as checked across all categories
- Checked items are removed from the active list
- Shopping sessions can be explicitly started and joined by both users
- Session tracks checked items and estimated expenses per category

**Mode is not persisted across sessions — always starts in plan mode.**

---

## Data Model (current understanding)

```
User
  - id, email, displayName

Shop
  - id, name
  - categoryOrder: CategoryId[] (ordered list for this shop)

Category (acts as a tag)
  - id, name
  - globalSortOrder: number

Item
  - id, name
  - quantity, unit
  - primaryCategoryId: CategoryId | null
  - secondaryCategoryIds: CategoryId[]
  - checked: boolean
  - checkedBy: UserId | null

Session
  - id
  - shopId: ShopId | null
  - startedBy: UserId
  - joinedBy: UserId | null
  - startedAt: timestamp
  - completedAt: timestamp | null
```

---

## Key Design Decisions

- **Categories are tags**, not containers — they are visible in the list only when items are assigned to them
- **Items have one primary category and zero or more secondary categories**
  - Plan mode: item appears once under primary category; secondary categories noted but not duplicated visually
  - Shop mode: item appears under all assigned categories
- **Checking an item** in shop mode removes it from the active list. Checked items do not appear in plan mode. Unchecked items persist across modes.
- **Category order is per-shop** — each shop stores its own ordered list of categories. A global default order is also configurable and used as fallback.
- **Settings are device-local** — not synced across devices. Each setting defaults to the device preference.
- **Shop deletion** removes shop and its category order config. Items and categories are unaffected.
- **Category deletion** unassigns items from that category — items are not deleted, they become uncategorised.

---

## Open Design Decisions

- Shop binding: categories are per-shop ordered, not owned — confirmed. Items are not tied to a shop.
- Permitted user definition: allowlist for now; may expand to a signup flow.
- Uncategorised items label: displayed at bottom of list — whether labelled "Uncategorised" or shown without a label TBD in design phase.
- Checked item visibility in shop mode: preferred behaviour is removal from active list. Alternative (keeping with distinct visual treatment) to be revisited during design.
- Session model: explicit shopping sessions are planned scope — to be fully specced.

---

## Planned Scope (not yet specced)

- **AI price estimation** — fetch indicative market price per item; show subtotal per category and session total while shopping
- **AI frequency tracking** — track how often items are bought; suggest or auto-add frequent items
- **Autocomplete on item add** — suggest previously added items; pre-fill category, quantity, unit from history
- **Barcode scanning** — AI-assisted matching of scanned product to existing list item by descriptive quality (ignoring brand/size)
- **Shopping sessions** — explicit session model with start, join, and close; session history used for frequency tracking and expense summaries
- **Signup flow** — if app is opened to general availability

---

## Project Structure (to be scaffolded)

```
/
├── CLAUDE.md
├── PLANNING.md
├── src/
│   └── app/
│       ├── core/
│       │   ├── api/          ← API service layer (only place aware of backend)
│       │   ├── auth/
│       │   └── store/        ← NgRx root state
│       ├── features/
│       │   ├── list/
│       │   ├── categories/
│       │   ├── shops/
│       │   └── settings/
│       └── shared/
└── tests/
    └── acceptance/
        ├── features/
        │   ├── auth/
        │   ├── modes/
        │   ├── settings/
        │   ├── categories/
        │   ├── shops/
        │   └── items/
        └── step-definitions/
```

---

## First Tasks for Claude Code

1. Scaffold the Angular PWA with the folder structure above
2. Install and configure: NgRx, Angular Material 3, Cucumber.js, Vitest
3. Generate feature files from `PLANNING.md`
4. Set up Firebase connection behind the API service layer
5. Implement auth feature (Google OAuth) — test-first
