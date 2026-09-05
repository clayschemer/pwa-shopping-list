# DESIGN.md — Shared Shopping List PWA

Design specification capturing all decisions from the UI/UX planning session.
Reference alongside `PLANNING.md`, `DATA-MODEL.md`, and `API-CONTRACT.md`.

---

## Design System

### Aesthetic Direction
Warm organic minimalism. The app should feel like a well-considered physical notebook — calm, tactile, personal. Not a cold productivity tool.

### Typography
- **Display / headlines:** DM Serif Display (Google Fonts) — humanist warmth, editorial character
- **Body / UI:** Plus Jakarta Sans (Google Fonts) — clean, slightly warm proportions

### Colour Palette

#### Seed colours
- **Primary:** Terracotta, hue 18 — earthy, not garish
- **Secondary:** Sage, hue 140 — muted green, calm
- **Neutral surface:** Hue 30 — slight warmth in the grey

#### Key tokens (light theme)
| Role | Value |
|---|---|
| primary | #b23000 |
| on-primary | #ffffff |
| primary-container | #ffdbd1 |
| secondary | #426f48 |
| secondary-container | #c1fbca |
| surface | #fff8f6 (warm white) |
| on-surface | #211a17 |
| surface-container | #f7ece6 |
| outline | #857468 |
| error | #ba1a1a |

Full token set (light, dark, high-contrast-light, high-contrast-dark) defined in `design-system.scss`.

### Theme Variants
All four theme variants are supported. Implementation follows Angular Material 3 conventions
(see `.claude/skills/angular-material3-theming/SKILL.md`):

- Light/dark: `color-scheme: light dark` on `html` as default; `html.theme-light` / `html.theme-dark` classes for explicit overrides
- High contrast: `@media (prefers-contrast: more)` as default; `body.theme-high-contrast` class for explicit override
- Compact: `body.theme-compact` class applying `mat.all-component-densities(-2)` **plus** CSS custom property overrides for all app-level spacing, line heights, and font sizes (`--app-spacing-*`, `--app-line-height-*`, `--app-font-size-*`). All component SCSS must use these tokens — not hardcoded values — so compact mode takes effect everywhere.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` as default; `body.theme-reduce-motion` class for explicit override

System preference is always the fallback. Classes are applied only when the user has made an explicit in-app choice, managed by a `ThemeService`.

### Motion Contract
All duration and easing defined as CSS custom properties (`--app-duration-*`, `--app-easing-*`).
Under `prefers-reduced-motion: reduce`, all durations collapse to `0ms` — every component becomes automatically compliant with no per-component media queries needed.

### Accessibility Baseline
- WCAG 2.1 Level AA throughout
- High contrast variants target AAA (≥7:1) for body text
- Touch targets: 48px default, 44px compact mode (both AA compliant)
- Focus: `:focus-visible` ring, 3px offset, primary colour. High contrast: 4px, black/white
- Font sizes respect user browser preferences (`font-size: 100%` on `html`)

### Reference Files
`design-system.scss` (project root) — design token specification: palette definitions, typography scale, spacing scale, motion contract. A human-readable reference, also used as the source of CSS custom property values.

`frontend/src/styles/` — Angular Material 3 implementation using multi-file structure:
- `_theme-colors.scss` — **generated** tonal palettes + high-contrast overrides. Source: `ng generate @angular/material:m3-theme --primary-color="#b23000" --secondary-color="#426f48" --neutral-color="#857468" --include-high-contrast`. Compatible with Material Theme Builder (`material-foundation.github.io/material-theme-builder`) — to swap themes, replace this file with builder output.
- `_theme-base.scss` — `mat.theme()` call + app-level spacing tokens.
- `_theme-overrides.scss` — Global component token overrides.
- `_theme-modes.scss` — Dark, high-contrast (full palette overrides for AAA), compact (density + spacing tokens), reduced-motion.

See `.claude/skills/angular-material3-theming/SKILL.md` for conventions.

### Loading States — Skeleton Loaders
Views that load async data show **skeleton loaders** — not spinners — while the data is being fetched. Skeletons mirror the visual structure of the real content (group containers, row heights, spacing, alignment) so the page feels stable and does not shift on load.

- **Colour:** `--mat-sys-surface-container-highest` — one step above the surface container, visible in both light and dark themes
- **Shape:** `border-radius: 0.25rem` on placeholder bars; container shapes match the real content (e.g. 0.5rem rounded groups)
- **Animation:** A gentle opacity pulse (`1 → 0.4 → 1` over 1.5s ease-in-out infinite). Suppressed under `prefers-reduced-motion` — placeholders remain static
- **Accessibility:** Entire skeleton wrapper carries `aria-hidden="true"`
- **Composition:** Each view creates its own skeleton layout reflecting its unique structure (e.g. plan mode shows category groups with item rows; shop mode adds checkbox placeholders; settings shows toggle rows with hint lines)

Shared pulse mixin lives in `frontend/src/styles/_skeleton.scss`. Components import it via `@use` and apply `@include skeleton.pulse;` on each placeholder element.

Spinners (`MatProgressSpinner`) are acceptable only for inline action feedback — e.g. a submit button in progress. They are not used for page-level content loading.

### Loading States — Boot Progress Card

App start-up is the one loading state where a skeleton alone is not enough: it spans several seconds and several distinct waits (app code, translations, auth, account, list data), and a static skeleton cannot distinguish "working" from "stuck". A **determinate progress card** is centred over the boot skeleton for the duration.

- **Composition:** a 0.25rem track with a `--mat-sys-primary` fill, a phase headline, and a quieter diagnostics line
- **Overlay, not curtain:** `pointer-events: none`, and the skeleton stays visible beneath it
- **Determinate, and honest.** Progress is a weighted sum of real milestones — never a timer. Milestones are tracked independently rather than as a sequence, because translations load in parallel with auth and the boot reads fan out together; a strict state machine would show the bar stalling while work was happening. Weights live in `frontend/src/app/core/boot/boot-metrics.ts`
- **The headline names the most significant outstanding milestone**, and is the only part announced (`role="status"`)
- **Boot ends when the user must act.** The sign-in, access-denied, and pending-verification screens are destinations, not loading states — the card clears rather than covering them
- **Two halves, one scale.** The pre-bootstrap segment is drawn by the inline script in `frontend/src/index.html` and owns 0–35%; `BootProgressService` continues from 35%. The splash card reserves the headline's line so the hand-off does not resize. Before bootstrap there is no denominator to divide by — the initial chunk count is not in the HTML — so that segment approaches its ceiling on a decelerating curve driven by real resource completions

**Exception to the i18n rule:** the diagnostics line (`items · categories · shops · sessions`, `41 · 1.6 MB`) is deliberately **not** translated. It is language-neutral technical detail — collection names, file names, counts — aimed at diagnosing a slow start, and it carries `aria-hidden`. Numbers still go through `Intl.NumberFormat` for the active locale, so a Swedish or German reader gets a decimal comma. This is the only place in the app where user-visible text bypasses transloco, and it is confined to the boot card.

---

## App Shell & Navigation (Screen 1)

### Structural Zones
| Zone | Description |
|---|---|
| A | OS status bar — safe area inset only, not styled |
| B | Fixed top bar — transparent background, adapts by mode |
| C | Scrollable content area — FAB fixed bottom-right in plan mode |
| D | Removed — no bottom navigation bar |

### Top Bar — Plan Mode
Left: hamburger menu | Centre: Plan/Shop mode toggle | Right: settings cogwheel (⚙)

Top bar background is **transparent** — floats over list content with minimum intrusion.

### Top Bar — Shop Mode
Left: undo icon ([undo]) with badge count | Centre: mode toggle | Right: session pill

In shop mode, **hamburger and cogwheel are hidden**. Top bar is minimal.

### Mode Toggle
Pill-style toggle, always centred in top bar. Each user's mode is independent. Mode resets to Plan on every new session (app open).

### Session Pill (shop mode, right slot)
- Primary text: shop name (or "Global" if no shop selected)
- Subheading: "active"
- When session total > 0: primary switches to £total, subheading shows shop name
- Tapping pill triggers close session dialog

### Nav Drawer (hamburger)
Opens as a left-side drawer with scrim. Top-to-bottom layout:

1. **Current shop layout** — labelled "Current shop layout" (not just "Shop layout"). Dropdown: "Global (all)" + all account shops. Changing selection reorders categories live. **"Manage shops…" link sits directly beneath this dropdown**, keeping shop-related controls together.
2. **Category list** — shown in current order for the selected shop. Each row is a jump-link (tap = scroll to that category + close drawer). Drag handle (⋮) on the right of each row implies reorderability — no tooltip needed. Reorder updates the shop-specific category order. **"+ Add category" row at the bottom of the category list** — triggers the add category sheet.

Structure summary:
```
[ Current shop layout  ▾ ]
  Manage shops…
─────────────────────────
  Categories
  Produce              ⋮
  Dairy                ⋮
  Bakery               ⋮
  Frozen               ⋮
  + Add category
```

Category reorder in drawer = shop-specific order for the selected shop. Global order is set separately via the category ⋯ menu on the list.

### FAB
- Plan mode only. Positioned bottom-right, fixed.
- Hidden in shop mode.
- Morphs into floating add-item input on tap (see Item Add flow).

---

## Item Row Layout

### Left to right (both modes):
```
[Item name]  [AI *]  [qty + unit / price stack]  [x or checkbox]
```

- **Item name:** primary text, large, bold, dark
- **Description (if set):** italic, muted, beneath name
- **AI indicator (\*):** shown only on AI-added items, between name and qty/price. Tappable — shows motivation.
- **Qty + unit:** secondary, mid-tone, right-aligned
- **Price:** tertiary, small, muted, beneath qty+unit
- **Remove (x):** plan mode only, far right, 44px touch target height
- **Checkbox:** shop mode only, far right, 56px wide touch strip (larger than visual checkbox)

### Left-handed mode
Mirrors checkbox to far left in shop mode. Setting in Settings only (no first-use prompt).

---

## Plan Mode Detail (Screen 2)

### List
- Items grouped under category headers
- Category header: name (left, uppercase, muted) + estimated total (right, muted) + ⋯ overflow menu (right). The estimated total is the sum of `price` for all active items in that category — same derivation as the Est. total in shop mode, but without the session checked total column. Hidden when no items in the category have a price set.
- Uncategorised group: always last, more muted label, no ⋯ menu, no total
- Items sorted alphabetically within category
- Tap row (outside x) = open edit sheet

### Category ⋯ Menu
- Rename
- Available in shops…
- Delete category

Delete: items in that category become uncategorised, not removed. Confirm dialog shown (warns user items will become uncategorised).

### Add Item Flow
FAB morphs into a floating pill input, expanding leftward from its position. The list remains fully visible — no overlay, no sheet.

**Stages:**
1. Pill expands — name input active, list visible behind
2. As user types, up to 3 autocomplete suggestions appear **above** the pill (growing upward), ranked by purchase frequency. Each suggestion shows: item name · qty+unit · category badge
3. When name is valid (>1 char): button inside pill reads **"OK"** (terracotta)
4. Tapping OK (or a suggestion): name is confirmed. Qty + unit field appears to the left of the "Add" button inside the pill. Layout: `[name badge] | [qty field (cursor here)] [unit dropdown] [Add]`
5. **"Add" is always green and always valid** — qty and unit are optional, never block submission
6. Tap Add: item added to list, pill collapses back to FAB
7. Dismiss: tap outside the pill

Unit field is a dropdown with ~20 options:
`pcs, g, kg, mg, ml, L, cl, bag, pack, box, can, bottle, jar, carton, bunch, head, loaf, slice, sheet, tsp, tbsp, cup, oz, lb`

Autocomplete suggestion pre-fills unit — dropdown only needed on first manual add.

Name conflict: inline error shown inside the pill. Add blocked until resolved.

Category, secondary categories, description, price: only accessible via the edit sheet after adding. Intentional — keeps add flow fast.

### Edit Item Sheet
Bottom sheet. Title = item name.

**Fields (in order):**
1. Item name
2. Description — optional, shown beneath name in list
3. Quantity + unit (dropdown)
4. Price — optional
5. Primary category — single-select chip group
6. Also appears in (shop mode) — multi-select chip group (secondary categories)
7. Available in shops — checkbox list of all shops. Reflects which shops include this item's
   primary category in their layout. Unchecking a shop removes the primary category from that
   shop's `categoryOrder` — this affects all items under that category, not only this one.
   Same operation as Category ⋯ → "Available in shops…" but accessible from the item.

"Save changes" button is **sticky to the bottom** of the sheet at all times regardless of scroll position.

Name conflict check runs on save, not on type. Save disabled on conflict.
No delete action in sheet — removal via x on list row.

### Add Category Sheet
Bottom sheet triggered from "+" in nav drawer category list.

**Fields:**
1. Category name

Buttons: [Cancel] [Add category] — side by side. Cancel also triggered by tapping outside the sheet. Name must be unique — inline error on conflict, save disabled.

New category is automatically added to all existing shops' category orders (appended at end). Exclusion from a specific shop is a separate action via "Available in shops…".

---

## Shop Mode Detail (Screen 3)

### Session Start
Switching to shop mode automatically triggers a shop selection sheet. No separate action needed.

Sheet contains: list of configured shops + "No specific shop (global)" option.
Each shop row shows an **active session indicator** when a session is already in progress at that shop — a secondary line reading "Active session" in the secondary colour, visible to both users. This lets the user see at a glance which shops have ongoing sessions.

Tapping any option starts or joins the session immediately. If an active session already exists for the selected shop, the user joins it automatically — no separate prompt.

**If no shops are configured:** sheet is skipped, global session starts automatically.

### Active Session
Session pill in top-bar right slot shows session status (see App Shell section).

### Category Headers in Shop Mode
Each category header shows two totals (right-aligned):
- **Est. [amount]** — estimated total of all active unchecked items in this category
- **✓ £[amount]** — session checked total for this category (this session only), shown when > 0

Est. total drops when any session checks an item. Session total rises.

### Check Interaction
- Tap checkbox (56px touch strip, far right of row) to check
- Item dims to ~42% opacity + strikethrough immediately (pending state)
- "tap to undo" button appears inside the price area — tapping it unchecks the item
- After 2 seconds with no action: item disappears from list
- Re-tap checkbox within the 2-second window: item unchecks, returns to full opacity
- Full row tap (outside checkbox and the "tap to undo" button): inert

### Undo History Menu
Opened via [undo] icon in top-bar left slot. Badge shows count of checked items this session.

Shows all items checked in current session, most recently checked first.
Each item shows: **user initials badge** (coloured by user) + item name + price.
Tapping an item: unchecks it, restores to list, removes from history.

### Close Session
Tapping the session pill always shows a confirm dialog. Two variants:

**All items checked:**
> "All done!"
> "Everything's checked off. Close this session and save the history?"
> [Not yet] [Close session]

**Items remaining:**
> "Close session?"
> "There are still unchecked items on your list. Close the session anyway?"
> [Keep shopping] [Close session]

No session total shown in the dialog (intentional — keep it simple).
No indicator of the other user's active session.

---

## Settings (Screen 4)

Full-screen page — the app shell top bar (hamburger, mode toggle, cogwheel) is hidden. Settings has its own `← Settings` header with a back button. Accessed via ⚙ cogwheel in plan mode top bar. Not accessible in shop mode.

### Appearance
| Setting | Control | Default |
|---|---|---|
| Dark mode | Toggle | System preference |
| Compact mode | Toggle | Off |

Dark mode toggle defaults to system preference. No "system default" option — the toggle value reflects system preference at all times.

### Accessibility
| Setting | Control | Default |
|---|---|---|
| Reduce motion | Toggle | System preference |
| High contrast | Toggle | System preference |
| Left-handed mode | Toggle | Off |

### Language & Region
| Setting | Control |
|---|---|
| Language | Dropdown (EN, NO, SV, DE, FR) |
| Currency | Dropdown (GBP, USD, EUR, NOK, SEK, DKK) |

Currency affects all price display throughout the app.

### Display
| Setting | Control | Default |
|---|---|---|
| Keep screen awake | Toggle | On |

Prevents screen dimming while shopping.

### AI
| Setting | Control |
|---|---|
| AI provider | Link to setup screen (TBD) |
| Auto-add suggestions | Toggle (shared account setting) |

AI auto-add is shared (account-level) — exception to the device-local rule. Either user can toggle it.

### Account
- Signed in as: [email]
- Sign out → confirm dialog

**Sign out dialog:**
> "Sign out?"
> "You will need to sign in again to access the list."
> [Cancel] [Sign out]

### Notes
- All settings are device-local — not synced across devices or users (except AI auto-add)
- Settings persist across sessions on the same device

---

## Nav Drawer & Manage Shops (Screen 5)

### Manage Shops Screen
Full screen, navigated to from "Manage shops…" link in the nav drawer (under the Current shop layout dropdown).

- **Add shop:** FAB bottom-right → bottom sheet with name input + [Cancel] [Add shop] buttons. New shop inherits global category order. Name must be unique.
- **Rename shop:** tap shop name → bottom sheet, pre-filled, [Cancel] [Save] buttons, inline error on name conflict.
- **Delete shop:** tap trash icon → confirm dialog. Shop and its category order config removed. Items and categories unaffected. Sessions referencing the deleted shop retain the shopId for historical accuracy.

Shops are shared — all changes visible to both users immediately.

### Available in Shops (Category)
Bottom sheet from category ⋯ menu → "Available in shops…"

Sheet header: category name + "Available in shops" subheading.
Body: checkbox list of all shops.

Unchecking a shop excludes this category (and its items) from that shop's session view.
New categories are included in all shops by default — exclusion is always explicit.

### Rename Category
Bottom sheet, pre-filled with current name. [Cancel] [Save] buttons.
Inline error on name conflict. Save button disabled when conflict exists.

### Delete Category
Confirm dialog shown. Copy warns user that items in this category will become uncategorised and will not be removed from the list. [Cancel] [Delete] (Delete styled as destructive).

### Category Groups (Categories screen)

Groups exist to make shop setup bearable. Adding a shop attaches every category to it, so a new furniture shop arrives carrying forty grocery categories. A group — "Grocery", "Furniture" — is how the irrelevant ones come off in one action.

Groups are **not** a second layer of organisation. They carry no ordering, never appear in plan or shop mode, and the categories list stays flat and in its configured order whether or not groups exist.

**Chip row.** Below the "Order for" selector, a horizontally scrolling row of chips — one per group, ordered by name — plus a dashed "+ Group" chip at the end. Tapping a group chip opens the group sheet; tapping "+ Group" opens it in create mode. The row scrolls on its own; the page never scrolls sideways.

**Group sheet.** Name field with inline conflict error, then an "Available in shops" checkbox list, then [Cancel] [Save] and a destructive "Delete group".

The checkboxes are **tri-state**, because a group's categories can be individually excluded from a shop:
- checked — every category in the group is available at that shop
- indeterminate — only some are
- unchecked — none are

Tapping an indeterminate *or* unchecked box makes the whole group available; tapping a checked box removes the whole group. A box left indeterminate changes nothing. A group with no categories shows a hint in place of the list rather than inert controls.

**Selection mode.** A "Select" text button sits beside the "Order for" selector. In selection mode each row swaps its drag handle for a checkbox, tapping a row toggles selection instead of opening the edit sheet, reordering is disabled, and the FAB is hidden. A bar shows "N selected" with [Select all] [Add to group…] [Remove from group…]. Select all matters — the common case is putting forty of forty-five categories into one group.

Long-press is deliberately *not* the entry point: it collides with drag initiation on touch.

**Row caption.** A category belonging to one or more groups shows their names as a caption under its name. Without it, bulk assignment is invisible and unverifiable. The separator is a translated string, not a hard-coded comma.

**Deleting a group** detaches it from its categories; it never deletes categories, and it does not change what is available at any shop. The confirm dialog says so explicitly.

**Overlap is last-action-wins.** A category can belong to several groups — cleaning products belong in both a supermarket and a furniture shop. Making one group available and then another unavailable leaves a shared category unavailable. Groups are bulk shortcuts, not rules that get re-evaluated.

---

## Auth (Screen 6)

### Sign In Screen
Full-screen, no navigation chrome. Warm surface background (`surface` token: #fff8f6).

Layout (centred, vertically):
- App logo mark
- App name / tagline
- Brief explanatory copy
- **"Continue with Google" button** — Material-spec Google sign-in button (white, subtle shadow, G mark)

No email/password input. Google OAuth only.

After tap: button dims with "Signing in…" copy. Google handles its own OAuth popup/redirect UI.

### Loading / Session Restore Screen
Shown briefly when auth state is already known (returning user) and the bootup sequence is running. No user action. Transitions automatically to plan mode on completion.

### Access Denied Screen
Shown when the user authenticates successfully with Google but their account is not on the allowlist.

- Not styled as an error — it is an expected state for non-permitted users
- Shows the email address that was used
- "Try a different account" link — returns to sign in screen
- No "request access" flow (out of current scope)

### Auth Flow
```
App loads
  └─ getAuthState()
       ├─ null → Sign in screen
       └─ User → getAccount()
                   ├─ AccessDeniedError → Access denied screen
                   └─ Account found → Bootup sequence → Plan mode
```

Access check occurs at `getAccount()` in the bootup sequence, not at the OAuth sign-in itself. Authentication (who are you?) is handled by `signIn()`; authorisation (are you permitted?) is enforced by `getAccount()` checking the account allowlist.

---

## Open Questions

| # | Screen | Question | Status |
|---|---|---|---|
| 1 | S1 | Shop → plan mode with active session: modal or bottom sheet? | Open |
| 2 | S2 | Price field: flat only, or also priceQty + priceUnit sub-fields in edit sheet? | Open |
| 3 | S4 | AI provider setup screen: content and flow | Open — needs own design pass |
| 4 | S5 | Manage shops: should shops be reorderable? | Open |

---

## Implementation Notes for Angular / Material 3

- Use `mat.define-theme` / `mat.theme()` per Angular Material 3 API — see `.claude/skills/angular-material3-theming/SKILL.md`
- For compact mode: apply `mat.all-component-densities(-2)` on `body.theme-compact`
- All AI features inactive unless `Account.aiConfig` is set — gate in service layer, not components
- Mode (plan/shop) is client-side NgRx store state only — not persisted, not synced
- Settings stored in `localStorage` — not in backend
- Check interaction undo window is client-side only — no API call until the 2s window expires
- Session auto-start on shop selection orchestrated by NgRx effect calling `startSession`
- Left-handed mode: CSS class on root, explicit `left`/`right` overrides on checkbox column only
- Nav drawer "Add category" → `addCategory` API operation. New category auto-appended to all shops' `categoryOrder` arrays (handled server-side per API contract)
- Nav drawer category drag reorder → `setShopCategoryOrder` when user lifts finger (single write on drop, not on every drag step)
