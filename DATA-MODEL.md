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
A named place to shop. Stores the category order and exclusions specific to that shop.

```
Shop
  - id
  - accountId: AccountId
  - name                                ← unique within account
  - categoryOrder: CategoryId[]         ← ordered, excludable list of categories for this shop
```

### Category
A tag that can be assigned to items. Not a container — exists in the list only when at least one active item is assigned to it.

```
Category
  - id
  - accountId: AccountId
  - name                                ← unique within account
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
  - price: number | null               ← single price field; user or AI, no distinction
  - priceQuantity: number | null        ← quantity the price applies to
  - priceUnit: string | null            ← unit the price applies to
  - priceUpdatedAt: timestamp | null    ← used to determine staleness; source (user/AI) not recorded
  - purchaseCount: number               ← incremented on each session completion where item was checked
```

**Notes on Item:**

- `description` is optional freetext displayed beneath the item name in both modes. No functional role — purely informational.
- `removed` is set to `true` by two actors: a plan-mode deletion, or a session check. It is cleared to `false` by an uncheck action (item restored to list).
- `price`, `priceQuantity`, `priceUnit`, and `priceUpdatedAt` form a single price record. The last writer wins — user or AI. No separate manual/estimated distinction.
- `aiMotivation` is set when the AI adds the item and is never updated. If the AI re-suggests the same item, the existing motivation is reused.
- `purchaseCount` is incremented once per completed session in which the item appears in the session's checked log. It is the basis for autocomplete frequency ranking.
- Price staleness is determined by `priceUpdatedAt` alone. Working assumption is a 6-12 month refresh window; exact threshold is an open decision.

### Session
Represents one user's active or completed shopping trip. Each user can have at most one active session at a time.

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
A log entry within a session. Records that a specific item was checked (picked up) during this session, along with the price and quantity at the time of checking.

```
SessionCheckedItem
  - itemId: ItemId
  - checkedBy: UserId
  - checkedAt: timestamp
  - priceSnapshot: number | null       ← price at time of checking; null if no price was set
  - priceQuantitySnapshot: number | null
  - priceUnitSnapshot: string | null
```

**Notes on Session:**

- `participants` starts with `startedBy` and grows as other users join. Designed for multiple users; currently a two-user product.
- `checkedItems` is the source of truth for session totals and purchase history. An item appearing here means it was physically picked up in this session.
- Price snapshots are recorded at the moment of checking so that session history remains accurate even if prices change later.
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
5. The undo action (brief window, shop mode only) is client-side only — visible only to the user who performed the check

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
- Two users can have independent active sessions simultaneously
- Checked state (`Item.removed`) is shared and real-time — checking in one session removes the item for all users
- Session totals are per-session and independent
- The category total drops when an item is checked in any session (it's gone from the list)

---

## Open Design Decisions

| # | Topic | Status |
|---|---|---|
| 1 | Price staleness threshold | Working assumption 6-12 months. Exact value TBD. |
| 2 | AI price lookup mechanics | Beyond shop priority order — how AI is instructed to find prices at a given shop. TBD. |
| 3 | Undo window duration | Resolved: 4-second window, client-side only, shop mode, checking user only. Item dims + strikethrough on check; tap again within window to undo; disappears after timeout. |
| 4 | Uncategorised items label | Resolved: "Uncategorised", muted style, always last in list, no context menu. |
| 5 | Permitted user definition | Allowlist for now; may expand to signup flow. |
| 6 | AI suggestion motivation refresh | If AI re-suggests an item, existing motivation is reused. Updating motivation on re-suggestion is a future consideration. |
| 7 | AI analytical scope | Starting with purchase frequency. Basket analysis, co-occurrence, spend trends etc. deferred. |

---

## Not In Scope (yet)

- User registration and invitation flow — initial users are hardcoded per account
- Broader AI analytics (basket analysis, price drift, item co-occurrence, spend trends)
- Signup flow for general availability
