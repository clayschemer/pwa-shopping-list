# DATA-MODEL.md — Shared Shopping List PWA

This document captures the logical data model and the design decisions behind it. It is backend-agnostic — nothing here assumes Firestore, PostgreSQL, or any other storage technology. How these entities map to collections, tables, or documents is an implementation concern.

---

## Guiding Principles

- **The model is backend-agnostic.** No entity, relationship, or rule should be expressed in terms of a specific database technology.
- **Items are never hard deleted.** Once created, an item record persists indefinitely. Removal from the active list is expressed through a removed flag, not deletion.
- **Checked state is global and first-write-wins.** When an item is checked by any user, it is checked for all users simultaneously. Concurrent check conflicts are resolved by rejecting the slower write with a graceful error to that user.
- **Session log is the source of truth for purchase history.** The item's removed flag is the source of truth for list visibility. These are set and cleared together on check and uncheck but represent different concerns.
- **The model supports multiple users per account.** The current product is two-user but the model must never assume that. User registration and invitation flows are not yet built — initial users are hardcoded — but the model must not make that expansion painful.
- **AI features are an optional layer.** The app is fully functional without AI. AI capabilities activate only when an AI provider is configured on the account.

---

## Entities

### Account
The top-level container. All shared data belongs to an account. Users belong to an account. This is the unit of isolation between different households or groups.

```
Account
  - id
  - name
  - aiConfig: AiConfig | null          ← null means AI features are inactive
```

### AiConfig
Stores the AI integration settings for an account. When absent or null, all AI features are disabled and the app operates in fully manual mode.

```
AiConfig
  - provider: 'claude' | 'openai' | ...
  - apiKeyRef                           ← reference to securely stored key, not the key itself
  - priceLookupShopOrder: ShopId[]      ← ordered list of shops the AI checks for prices, account-specific
  - autoAddEnabled: boolean             ← shared setting; either user can toggle
```

### User
A person with access to the account. Multiple users can belong to the same account and share the same list.

```
User
  - id
  - accountId: AccountId                ← set by admin when approving a pending user
  - email
  - displayName
  - selectedShopId: ShopId | null       ← persisted on the account member doc; drives nav-drawer
                                          shop selection on reload; updated on shop-mode entry
                                          and plan-mode shop change; reset to null on shop deletion
  - verified: boolean                   ← optional; absent on legacy records (treated as verified),
                                          self-written as false on first sign-in, flipped to true by admin
  - createdAt: timestamp                ← optional; self-written on pending registration
```

**Verification lifecycle.** On first Google sign-in the user's own client writes
`/users/{uid}` with `verified: false` and no `accountId`. The account owner
(admin) then flips `verified: true` and sets `accountId` in the Firebase
console. Until both are in place the user sees a pending-verification screen and
has no read access to anything beyond their own `/users/{uid}` doc. Records
missing the `verified` field are treated as verified so existing hand-created
allowlist entries keep working without migration.

### Shop
A named place to shop. Stores the category order and exclusions specific to that shop, and the URL template used to fetch prices from that shop's website.

```
Shop
  - id
  - accountId: AccountId
  - name                                ← unique within account
  - categoryOrder: CategoryId[]         ← ordered, excludable list of categories for this shop
  - priceSearchUrl: string | null       ← URL template with {query} placeholder for price lookup;
                                          null = shop is skipped during price lookup
```

### Category
A tag that can be assigned to items. Not a container — exists in the list only when at least one active item is assigned to it.

```
Category
  - id
  - accountId: AccountId
  - name                                ← unique within account
  - color: string | null                ← optional hex color (e.g. '#FF5733'); null = no color
  - globalSortOrder: number             ← fallback order when no shop is selected
```

### Item
The core entity. Items are never hard deleted. Removal from the active list is expressed through the `removed` flag.

```
Item
  - id
  - accountId: AccountId
  - name                                ← unique within account
  - description: string | null          ← optional freetext shown beneath name in the list
  - quantity: number | null
  - unit: string | null
  - primaryCategoryId: CategoryId | null
  - secondaryCategoryIds: CategoryId[]
  - removed: boolean                    ← source of truth for list visibility
  - removedAt: timestamp | null         ← set when removed, cleared when restored
  - addedBy: 'user' | 'ai'             ← origin indicator only, no functional difference
  - aiMotivation: string | null         ← populated when addedBy is 'ai'; persists for reference
  - price: number | null               ← single price field; last writer wins (user or pipeline)
  - priceQuantity: number | null        ← quantity the price applies to
  - priceUnit: string | null            ← unit the price applies to
  - priceShopId: ShopId | null          ← which shop's price is stored (Option B); null when manually
                                          set or when the item pre-dates this field
  - priceProductName: string | null     ← matched product name from the last successful pipeline run;
                                          null for manually-entered prices or items pre-dating the field
  - priceProductUrl: string | null      ← product page URL when the source exposed one; powers the
                                          "inspect matched product" deep-link
  - priceSearchUrl: string | null       ← search-results URL the pipeline scraped for this match;
                                          fallback link target when priceProductUrl is unavailable
  - priceFeedback: PriceFeedbackEntry[] ← user rejections of prior price matches; consumed by the next
                                          pipeline run; cleared on successful re-match
  - priceUpdatedAt: timestamp | null    ← used to determine staleness; source (user/pipeline) not recorded
  - sizePerPieceQuantity: number | null ← typical size of one piece; bridges pcs <-> mass/volume
  - sizePerPieceUnit: string | null     ← unit for sizePerPieceQuantity ('g', 'kg', 'ml', 'cl', 'dl', 'L')
  - purchaseCount: number               ← incremented on each session completion where item was checked
```

### PriceFeedbackEntry
A single rejection entry stored on an Item. The pipeline reads the array on
the next lookup and instructs the LLM to avoid these prior matches.

```
PriceFeedbackEntry
  - rejectedName: string
  - rejectedUrl:  string | null
  - reason:       string                ← user-provided, non-empty
  - timestamp:    timestamp
```

**Notes on Item:**

- `description` is optional freetext displayed beneath the item name in both modes. Also passed to the price-lookup pipeline as context — notes like "inte Arla" or "ekologisk" influence which search result is selected by the LLM validation step.
- `removed` is set to `true` by two actors: a plan-mode deletion, or a session check. It is cleared to `false` by an uncheck action (item restored to list).
- `price`, `priceQuantity`, `priceUnit`, `priceShopId`, and `priceUpdatedAt` form a single price record. The last writer wins — user or pipeline. No separate manual/estimated distinction. `priceShopId` identifies which shop's price is stored (Option B: single price + source shop), enabling the UI to flag staleness when the active session shop differs from `priceShopId`. Full per-shop price maps are a future enhancement.
- `priceProductName` and `priceProductUrl` capture *which* product the pipeline matched. They are set together by the pipeline whenever the LLM-returned `matchedName` resolves to an extracted JSON-LD product. Both are cleared when the price is cleared. They power the in-app price-inspection affordance — clicking a price opens a card showing the matched product with a link to its source page.
- `priceFeedback` captures user rejections of prior matches. Each entry records the rejected match (name + URL) and the user's reason. The pipeline reads this array on the next run and instructs the LLM to avoid the listed matches and apply the reasons. The array is cleared by a successful pipeline write so feedback does not influence indefinitely. Independent of this operational state, every rejection is also append-written to an immutable corpus collection (see *Price feedback corpus* below) for future training analysis.
- `sizePerPieceQuantity` and `sizePerPieceUnit` describe what one piece of the item typically weighs or measures — used by the frontend to convert between `pcs` and weight/volume when the user lists by piece but the shelf is priced per kg (or vice versa). The pipeline pre-fills it for produce-like items via Gemma. Sticky to user edits: once non-null, the pipeline does not overwrite. Clearing both fields lets the pipeline re-estimate on the next run.
- `aiMotivation` is set when the AI adds the item and is never updated. If the AI re-suggests the same item, the existing motivation is reused.
- `purchaseCount` is incremented once per completed session in which the item appears in the session's checked log. It is the basis for autocomplete frequency ranking.
- Price staleness is determined by `priceUpdatedAt` alone. Working assumption is a 6-12 month refresh window; exact threshold is an open decision.

### Price feedback corpus (side-channel)

In addition to the operational `priceFeedback` array on the item, every user
rejection is append-written to an immutable per-account collection. This is a
side-channel store — it is never read by the pipeline or the frontend, and it
is not part of the API contract. Its sole purpose is to retain a durable
training corpus for future model fine-tuning.

```
PriceFeedbackLogEntry
  - itemId: ItemId
  - itemName: string                    ← name at the time of feedback
  - description: string | null          ← shopper notes at the time of feedback
  - categoryName: string | null         ← primary category name at the time of feedback
  - shopId: ShopId | null               ← active priceShopId at the time of feedback
  - reason: string                      ← the user's explanation
  - createdBy: UserId
  - createdAt: timestamp
```

### Session
Represents an active or completed shopping trip at a specific shop. At most one active session per shopId per account — multiple shops may have concurrent active sessions. Users shopping at the same shop share a single session.

```
Session
  - id
  - accountId: AccountId
  - shopId: ShopId | null              ← null means shopping without a specific shop (global)
  - participants: UserId[]             ← all users participating in this session
  - startedBy: UserId
  - startedAt: timestamp
  - completedAt: timestamp | null      ← null means session is active
  - checkedItems: SessionCheckedItem[]
```

### SessionCheckedItem
A log entry within a session. Records that a specific item was checked (picked up) during this session, along with the name, price, and quantity at the time of checking.

```
SessionCheckedItem
  - itemId: ItemId
  - checkedBy: UserId
  - checkedAt: timestamp
  - priceSnapshot: number | null       ← price at time of checking; null if no price was set
  - priceQuantitySnapshot: number | null
  - priceUnitSnapshot: string | null
  - nameSnapshot: string | null        ← item name at time of checking; null on legacy entries written before this field existed
  - quantitySnapshot: number | null    ← item purchase quantity at time of checking; null on legacy entries written before this field existed
  - unitSnapshot: string | null        ← item purchase unit at time of checking; null on legacy entries written before this field existed
```

**Notes on Session:**

- At most one active session per `shopId` per account. When a second user selects the same shop, they join the existing session automatically.
- `participants` starts with `startedBy` and grows as other users join. Designed for multiple users; currently a two-user product.
- `checkedItems` is the source of truth for session totals and purchase history. An item appearing here means it was physically picked up in this session. The committed undo history is visible to all session participants.
- Name and price snapshots are recorded at the moment of checking so that session history (and the in-session undo list) remains accurate even if the underlying item is later renamed, removed, or evicted from the active-list store.
- On session completion, `purchaseCount` is incremented on each item that appears in `checkedItems`.

---

## Derived Values

These are computed from stored data, not stored themselves.

| Value | Derived From |
|---|---|
| Active list items | Items where `removed = false` |
| Category estimated total (both modes) | Sum of `price` for active items in that category |
| Session checked total | Sum of `priceSnapshot` for items in `session.checkedItems` for this session |
| Category checked total (shop mode) | Sum of `priceSnapshot` for checked items in that category within this user's active session |
| Autocomplete suggestions | Items where `removed = false OR removedAt IS NOT NULL`, ranked by `purchaseCount` descending |
| Item visibility in shop mode | Active sessions' `checkedItems` determines which items show as checked |

---

## Key Behaviours

### Checking an item
1. First-write-wins — concurrent checks are resolved by rejecting the slower write
2. The winning write sets `Item.removed = true` and `Item.removedAt = now`
3. A `SessionCheckedItem` entry is added to the checking user's active session with a price snapshot
4. The slower user receives a graceful error indicating the item was already removed
5. The undo action has two layers: a 4-second pending window (client-side only, visible only to the checking user) and the committed undo history (shared, visible to all session participants)

### Unchecking an item
1. Removes the `SessionCheckedItem` entry from the session log
2. Clears `Item.removed` and `Item.removedAt`
3. Item reappears on the active list for all users

### Plan-mode removal
1. Sets `Item.removed = true` and `Item.removedAt = now`
2. No session log entry is created
3. Item disappears from the active list and from all active session views
4. Item persists in the database for autocomplete and history purposes

### Two displayed totals per category in shop mode
- **Category total** — full estimated value of all active, unchecked items in the category. Drops when an item is removed (either by plan-mode deletion or checked in any session).
- **Session checked total** — running checkout bill for this session only. Drops when an item is unchecked. Unaffected by the other user's session activity.

### Concurrent sessions
- At most one active session per shop per account. Two users at the same shop share a session; two users at different shops have independent sessions.
- Checked state (`Item.removed`) is shared and real-time — checking in one session removes the item for all users
- Session totals are per-session and independent — each shop's session has its own running total
- The category total (estimated) drops when an item is checked in any session (it's gone from the list)
- The committed undo history for a session is shared across all participants; any participant can undo any check

---

## Open Design Decisions

| # | Topic | Status |
|---|---|---|
| 1 | Price staleness threshold | Working assumption 6 months (180 days) in pipeline config; exact value TBD. |
| 2 | AI price lookup mechanics | **Resolved.** External pipeline (Playwright + Ollama/Gemma). See `price-pipeline/`. Shop-specific URL in `Shop.priceSearchUrl`. No aggregator fallback — if all shops fail, item stays unpriced. |
| 3 | Undo window duration | Resolved: 4-second window, client-side only, shop mode, checking user only. |
| 4 | Uncategorised items label | Resolved: "Uncategorised", muted style, always last in list, no context menu. |
| 5 | Permitted user definition | Allowlist for now; may expand to signup flow. |
| 6 | AI suggestion motivation refresh | If AI re-suggests an item, existing motivation is reused. Updating motivation on re-suggestion is a future consideration. |
| 7 | AI analytical scope | Starting with purchase frequency. Basket analysis, co-occurrence, spend trends etc. deferred. |
| 8 | Store-specific prices | **Resolved (Option B).** Single price per item tagged with `priceShopId`. UI shows staleness hint when active session shop differs. Full per-shop price map deferred. |

---

---

## Price Pipeline Architecture

Price lookup is implemented as a separate server-side pipeline in `price-pipeline/` — it is not part of the Angular app and has no direct dependency on the frontend code. It communicates with the backend exclusively through the same Firestore write path as `setItemPrice()`.

### How it works

```
Scheduler (nightly + 30-min quick-scan)
  ↓
Query Firestore — items where priceUpdatedAt is null or older than threshold
  ↓
For each item, for each shop in AiConfig.priceLookupShopOrder:
  → Build search URL from Shop.priceSearchUrl + item name + qty/unit
  → Playwright fetch (headless Chromium) — scrapes the store's search results page
  → Structured extraction — JSON-LD parsing, fallback to page text
  → Gemma validation (Ollama) — selects best match, respects item.description context
  → If match found: write price + priceShopId back to Firestore → triggers itemChanges$ stream
  → If no match: try next shop
  ↓
If all shops fail: item stays unpriced; no aggregator fallback
```

### Key decisions

- **No aggregator fallback.** Grocery aggregators (e.g. Prisjakt) return multi-category results that produce unreliable prices for food. All lookups use store-specific URLs.
- **`Shop.priceSearchUrl`** is the authoritative source for each shop's search URL template (`{query}` placeholder). The pipeline also reads a local `stores.json` for experimentation; this is a bridge that becomes irrelevant once all shops have `priceSearchUrl` populated via the Manage Shops UI.
- **`item.description` is passed to the LLM** as shopper context. Notes like "inte Arla" or "ekologisk" directly influence product selection in the validation step.
- **`priceShopId`** (Option B) records which shop's price is stored, enabling the UI to show a staleness hint when the active session shop differs.
- **Graceful degradation.** If `AiConfig` is null, the pipeline is inactive. If the pipeline server is unreachable, prices stay at their current values. Individual item failures are logged and skipped — the pipeline never writes partial or invalid data.
- **Infrastructure**: Docker Compose locally (Ollama + Playwright containers), ECS Fargate on AWS in production. Local Docker serves as a production emulator during the private phase — same containers, same Firebase credentials, real Firestore writes.

### Scheduling

| Trigger | Scope | Condition |
|---|---|---|
| Every 30 minutes | Unpriced items only | `priceUpdatedAt == null` |
| Nightly at 02:00 UTC | Full sweep | `priceUpdatedAt < now - PRICE_STALE_DAYS` or null |

---

## Not In Scope (yet)

- User registration and invitation flow — initial users are hardcoded per account
- Broader AI analytics (basket analysis, price drift, item co-occurrence, spend trends)
- Signup flow for general availability
