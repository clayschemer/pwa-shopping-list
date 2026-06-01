# API-CONTRACT.md — Shared Shopping List PWA

This document defines the contract between the Angular application and its backend. It is
backend-agnostic: nothing here assumes Firebase, HTTP, or any specific transport or storage
technology. The Angular app communicates exclusively through service classes that implement
this contract. Swapping the backend means replacing those service classes — no component,
store effect, or test changes.

The contract is layered:

1. **Identity types** — branded ID types used throughout
2. **Entity types** — the shapes of all shared data
3. **Error types** — semantic errors the app must handle explicitly
4. **Stream contract** — how live data is delivered
5. **Operations** — what the app can ask the backend to do, per domain
6. **Bootup sequence** — how the app initialises
7. **Appendix** — what this contract does not cover

TypeScript interfaces can be generated directly from this document. All types described
here map 1:1 to TypeScript.

---

## Guiding Rules

- **Operations are named by intent, not transport.** `fetchActiveList` not `GET /items`.
- **No implementation detail leaks.** No mention of Firestore, HTTP verbs, tokens,
  collection paths, or document structure.
- **Null is explicit.** A field typed as `T | null` always exists on the object but may
  have no value. There are no optional fields — every field is always present on every entity.
- **Timestamps are Unix milliseconds** (`number`). The service implementation normalises
  Firestore Timestamps, ISO 8601 strings, or any other backend representation before emitting.
- **IDs are branded strings.** Each entity type has its own ID type. Passing a `CategoryId`
  where a `ShopId` is expected is a compile-time error.
- **The stream emits batches of change events, grouped by entity type.** A batch is an
  array of one or more changes to entities of the same type. Single-entity changes are
  a batch of one. Multi-entity changes — such as multiple items being marked removed when
  a session closes — are a batch of many. Batches are never mixed across entity types.
- **Errors are typed values, not thrown exceptions** (where the error is a valid, foreseeable
  outcome). Operations that can produce semantic errors return a discriminated union. Network
  failures and truly unexpected errors may still throw.

---

## Part 1 — Identity Types

Branded string types that prevent ID mix-ups at compile time.

```
AccountId  — brand: 'account'
UserId     — brand: 'user'
ShopId     — brand: 'shop'
CategoryId — brand: 'category'
ItemId     — brand: 'item'
SessionId  — brand: 'session'
```

In TypeScript:

```typescript
type AccountId  = string & { readonly __brand: 'account'  }
type UserId     = string & { readonly __brand: 'user'      }
type ShopId     = string & { readonly __brand: 'shop'      }
type CategoryId = string & { readonly __brand: 'category'  }
type ItemId     = string & { readonly __brand: 'item'      }
type SessionId  = string & { readonly __brand: 'session'   }
```

---

## Part 2 — Entity Types

These are the shapes the Angular app works with. The service implementation is responsible
for transforming whatever the backend returns into these shapes before emitting or returning.

### Account

```
Account {
  id:       AccountId
  name:     string
  aiConfig: AiConfig | null    // null = AI features inactive for this account
}
```

### AiConfig

```
AiConfig {
  provider:             string      // e.g. 'claude', 'openai' — treated as opaque string
  priceLookupShopOrder: ShopId[]    // ordered; AI checks shops in this order for prices
  autoAddEnabled:       boolean     // shared account setting; either user can toggle
}
```

Note: `apiKeyRef` is a backend-internal concern. The frontend never sees the key or any
reference to it. It is intentionally absent from this contract.

### User

```
User {
  id:          UserId
  accountId:   AccountId
  email:       string
  displayName: string
}
```

### Shop

```
Shop {
  id:              ShopId
  accountId:       AccountId
  name:            string
  categoryOrder:   CategoryId[]   // ordered; categories excluded from this shop are absent
  priceSearchUrl:  string | null  // URL template with {query} placeholder for price lookup;
                                  // null = shop is skipped during pipeline price lookup
}
```

### Category

```
Category {
  id:              CategoryId
  accountId:       AccountId
  name:            string
  color:           string | null   // hex color, e.g. '#FF5733'; null = no color
  globalSortOrder: number
}
```

### Item

```
Item {
  id:                   ItemId
  accountId:            AccountId
  name:                 string
  description:          string | null
  quantity:             number | null
  unit:                 string | null
  primaryCategoryId:    CategoryId | null
  secondaryCategoryIds: CategoryId[]
  removed:              boolean
  removedAt:            number | null    // Unix ms; null when item is active
  addedBy:              'user' | 'ai'
  aiMotivation:         string | null    // populated when addedBy is 'ai'
  price:                number | null
  priceQuantity:        number | null
  priceUnit:            string | null
  priceShopId:          ShopId | null    // which shop's price is stored; null when manually set
                                         // or when the item pre-dates this field (Option B)
  priceProductName:     string | null    // matched product name from the last successful pipeline run;
                                         // null for manual prices or pre-existing items
  priceProductUrl:      string | null    // matched product page URL when the source exposed one;
                                         // null when unavailable
  priceSearchUrl:       string | null    // search-results URL the pipeline used; powers the
                                         // "view search results" fallback in the inspect popup
                                         // when productUrl is absent
  priceFeedback:        PriceFeedbackEntry[]   // empty array when none; user rejections of prior
                                               // price matches, consumed by the next pipeline run
  priceUpdatedAt:       number | null    // Unix ms; null if price has never been set
  purchaseCount:        number
}
```

### PriceFeedbackEntry

```
PriceFeedbackEntry {
  rejectedName: string         // product name that the user rejected
  rejectedUrl:  string | null  // product page URL of the rejected match, when known
  reason:       string         // user-provided explanation
  timestamp:    number         // Unix ms; when the rejection was recorded
}
```

Operational only. The pipeline reads this array on the next lookup to instruct
the LLM to avoid these prior matches and apply the reasons given. A successful
re-match clears the array. An immutable corpus copy is also written to a
side-channel store (`accounts/{accountId}/priceFeedback`) and is not exposed
through this contract.

### Session

```
Session {
  id:           SessionId
  accountId:    AccountId
  shopId:       ShopId | null       // null = shopping without a specific shop (global)
  participants: UserId[]
  startedBy:    UserId
  startedAt:    number              // Unix ms
  completedAt:  number | null       // Unix ms; null = session is still active
  checkedItems: SessionCheckedItem[]
}
```

### SessionCheckedItem

```
SessionCheckedItem {
  itemId:                ItemId
  checkedBy:             UserId
  checkedAt:             number        // Unix ms
  priceSnapshot:         number | null
  priceQuantitySnapshot: number | null
  priceUnitSnapshot:     string | null
  nameSnapshot:          string | null // null only on legacy entries written before the field existed
  quantitySnapshot:      number | null // item purchase quantity at check time; null on legacy entries
  unitSnapshot:          string | null // item purchase unit at check time; null on legacy entries
}
```

---

## Part 3 — Error Types

Semantic errors are valid, foreseeable outcomes that the UI must handle explicitly.
They are returned as typed discriminated union values, not thrown exceptions.

```
NameConflictError {
  type:       'NAME_CONFLICT'
  entityKind: 'item' | 'category' | 'shop'
  name:       string
}

CheckConflictError {
  type:   'CHECK_CONFLICT'
  itemId: ItemId
}
// Another user checked this item first. The UI should inform the checking user
// and remove the item from their view. The item's updated state will arrive
// via itemChanges$ reflecting the winning check.

SessionConflictError {
  type: 'SESSION_CONFLICT'
}
// An active session for this shopId already exists on the account and could
// not be joined due to a race condition. Normal flow uses start-or-join
// semantics and should not hit this error.

NotFoundError {
  type:       'NOT_FOUND'
  entityKind: 'item' | 'category' | 'shop' | 'session'
  id:         string
}

AccessDeniedError {
  type: 'ACCESS_DENIED'
}
// User authenticated successfully but is not permitted to access this account.

PendingVerificationError {
  type: 'PENDING_VERIFICATION'
}
// User authenticated successfully, has a pending /users/{uid} record, but has
// not yet been verified by the account owner. The user sees a pending-verification
// screen. Approval is a manual admin step (flip `verified` and set `accountId`).

AiUnavailableError {
  type: 'AI_UNAVAILABLE'
}
// AiConfig is not set on the account. The requested AI operation cannot proceed.

StreamError {
  type:    'AUTH_REVOKED' | 'ACCOUNT_NOT_FOUND' | 'STREAM_FAILED'
  message: string
}
// Unrecoverable stream failure. Surfaced via the dedicated streamError$ observable.
// Transient failures are retried internally and never reach the app.
```

---

## Part 4 — Stream Contract

### Design

All live data arrives through a **single underlying change stream**. The service establishes
this stream once (on initialisation or first subscription) and maintains it. Incoming events
are fanned out to per-entity typed Observables that NgRx effects subscribe to.

The Angular app never interacts with the raw stream. It subscribes only to the typed,
per-entity Observables.

### EntityChange and EntityChangeBatch — the units of the stream

```
EntityChange<T> {
  entity:     T             // full, normalised entity — always complete, never partial
  changeType: 'added' | 'modified' | 'removed'
}

EntityChangeBatch<T> = EntityChange<T>[]
```

Every emission on a per-entity Observable is a **batch**: an array of one or more
`EntityChange` objects for entities of the same type. Batches are never mixed across
entity types — a single emission never contains both Item changes and Session changes.

A single-entity change is a batch of size one. A multi-entity change — such as multiple
items having their `purchaseCount` incremented when a session closes, or several items
being marked removed at once — is a batch of many. NgRx effects handle both identically,
since they always operate on the array.

The entity within each change is always the complete, normalised object as defined in
Part 2. There is no concept of a partial update reaching the app — the implementation
assembles the full entity before emitting.

### Per-entity Observables

```
itemChanges$:     Observable<EntityChangeBatch<Item>>
categoryChanges$: Observable<EntityChangeBatch<Category>>
shopChanges$:     Observable<EntityChangeBatch<Shop>>
sessionChanges$:  Observable<EntityChangeBatch<Session>>
accountChanges$:  Observable<EntityChangeBatch<Account>>
userChanges$:     Observable<EntityChangeBatch<User>>
```

NgRx effects subscribe to these and apply each batch to the store. For each
`EntityChange` in the batch:

- `added`    → upsert entity into the relevant collection in the store
- `modified` → replace the entity in the store by ID
- `removed`  → remove the entity from the store by ID

The store owns the collection. The stream keeps it current.

### Stream error behaviour

Transient errors (network blips, brief unavailability) are retried internally by the
implementation. The per-entity Observables never emit these.

Unrecoverable errors are emitted on a dedicated channel:

```
streamError$: Observable<StreamError>
```

The app subscribes to `streamError$` globally and responds accordingly — for example,
redirecting to sign-in on `AUTH_REVOKED` or showing a fatal error state on `STREAM_FAILED`.

### Implementation behaviour (not part of the contract)

The contract specifies what the stream emits. How implementations produce that emission
is their own concern.

**Firebase implementation**
`onSnapshot` fires on a collection and provides an array of document changes per cycle,
each tagged as added, modified, or removed. This maps directly to `EntityChangeBatch<T>`.
The full document Firebase provides is used as-is after normalisation (ID merging,
timestamp conversion). No additional fetch is made. Batches of many naturally occur
when multiple documents change in a single Firestore transaction — for example, a session
close that marks several items as removed and increments their purchaseCount.

**SSE future implementation**
The SSE connection emits a notification carrying an entity kind and one or more IDs.
The implementation fetches the full entities for all IDs in the notification, normalises
them, and emits them together as a single `EntityChangeBatch<T>`. A single SSE event
referencing multiple IDs produces one batch emission, preserving the atomicity of the
original backend operation. From the Angular app's perspective the emission is identical
to the Firebase case.

Both implementations satisfy the same Observable contract. The Angular app cannot
distinguish between them.

---

## Part 5 — Operations

Operations are grouped by domain. Each entry specifies intent, inputs, output on success,
and any semantic errors that can be returned as typed values.

All operations are asynchronous and return a `Promise`. Live updates resulting from write
operations arrive via the Observables in Part 4 — write operations do not return the
updated entity unless it is needed immediately by the caller (e.g. `addItem` returns the
created Item so the UI can reference it before the stream confirms).

---

### 5.1 Auth

#### signIn
```
Intent:  Initiate sign-in with the configured identity provider.
Input:   none
Output:  User
Errors:  none
```

#### signOut
```
Intent:  End the current authenticated session and clear all local auth state.
Input:   none
Output:  void
Errors:  none
```

#### getAuthState
```
Intent:  Observe the authentication state for the lifetime of the app.
Input:   none
Output:  Observable<User | null>
         Emits immediately with current state.
         Emits null when signed out or before sign-in completes.
Errors:  none (stream; unrecoverable failures surface via streamError$)
```

---

### 5.2 Account

#### getAccount
```
Intent:  Fetch the current account record once, on app init.
         Subsequent changes arrive via accountChanges$.
         Also gates access: on first call for a new Google user the service
         self-registers a pending /users/{uid} record and returns
         PendingVerificationError until an admin flips the verified flag
         and assigns an accountId.
Input:   none
Output:  Account
Errors:  AccessDeniedError            — no Firebase user, or unrecoverable failure
         PendingVerificationError     — user exists but is awaiting admin approval
```

#### updateAiConfig
```
Intent:  Set or replace the AI configuration for the account.
         Passing null disables all AI features.
         The updated Account arrives via accountChanges$.
Input:   config: AiConfig | null
Output:  void
Errors:  none
```

#### toggleAiAutoAdd
```
Intent:  Enable or disable the AI auto-add setting on the account.
         This is a shared setting — the change affects both users immediately.
         The updated Account arrives via accountChanges$.
Input:   enabled: boolean
Output:  void
Errors:  AiUnavailableError
```

---

### 5.3 Users

#### fetchAccountUsers
```
Intent:  Fetch all users belonging to the current account once, on app init.
         Seeds the store. Subsequent changes arrive via userChanges$.
         Used to resolve UserId references to display names and initials
         (e.g. undo history menu, session participant display).
Input:   none
Output:  User[]
Errors:  none
```

#### setSelectedShopId
```
Intent:  Persist the user's selected shop for the nav-drawer category-order view.
         Fire-and-forget — the store is updated locally first; this write is
         purely for cross-session persistence.
         Called on plan-mode shop change and shop-mode entry.
Input:   shopId: ShopId | null   (null = global / no shop)
Output:  void (Promise)
Errors:  none (best-effort write)
```

---

### 5.4 Items

#### fetchActiveList
```
Intent:  Fetch all non-removed items for the account once, on app init or reconnect.
         Seeds the store. Subsequent changes arrive via itemChanges$.
Input:   none
Output:  Item[]
Errors:  none
```

#### addItem
```
Intent:  Add a new item to the shared list.
         The new Item arrives via itemChanges$.
Input:   name:                 string
         description:          string | null
         quantity:             number | null
         unit:                 string | null
         primaryCategoryId:    CategoryId | null
         secondaryCategoryIds: CategoryId[]
Output:  Item
Errors:  NameConflictError
```

#### updateItem
```
Intent:  Edit the details of an existing list item.
         The updated Item arrives via itemChanges$.
Input:   id:                   ItemId
         name:                 string
         description:          string | null
         quantity:             number | null
         unit:                 string | null
         primaryCategoryId:    CategoryId | null
         secondaryCategoryIds: CategoryId[]
Output:  Item
Errors:  NotFoundError
         NameConflictError    // only if the name was changed and the new name is taken
```

#### setItemPrice
```
Intent:  Set or update the price, reference quantity, unit, and source shop for an item.
         Last writer wins — whether the caller is a user action or the price pipeline.
         Passing null for price clears the price record entirely (shopId, productName,
         and productUrl are also cleared).
         The updated Item arrives via itemChanges$.
Input:   id:            ItemId
         price:         number | null
         priceQuantity: number | null
         priceUnit:     string | null
         shopId:        ShopId | null   // which shop's price this is; null for manual entry
Output:  void
Errors:  NotFoundError
```

#### submitPriceFeedback
```
Intent:  Record that the user believes the current price match is incorrect.
         Appends an entry to the item's priceFeedback array (capturing the
         currently-displayed match name/url and the user's reason) and queues
         the item for re-estimation by resetting priceUpdatedAt to null.
         Also writes an immutable corpus entry capturing the full search
         context (item name, description, category, shop, reason) for future
         model-training analysis. The corpus entry is not exposed back through
         this contract.
         The updated Item arrives via itemChanges$ as a batch of one.
Input:   id:     ItemId
         reason: string   // user-provided explanation; must be non-empty
Output:  void
Errors:  NotFoundError
```

#### removeItem
```
Intent:  Remove an item from the active list. This is a plan-mode soft delete.
         Sets removed = true on the item. No session log entry is created.
         The item is not hard deleted and remains available for autocomplete.
         The updated Item arrives via itemChanges$.
Input:   id: ItemId
Output:  void
Errors:  NotFoundError
```

#### checkItem
```
Intent:  Mark an item as picked up during a shopping session.
         Sets removed = true and appends a SessionCheckedItem to the active session,
         snapshotting the current name and price at the moment of checking. The name
         snapshot keeps the in-session undo list and historical session log accurate
         even if the underlying item is later renamed, removed, or no longer in the
         loaded items store.
         First-write-wins: if two users check the same item concurrently, the slower
         write is rejected and a CheckConflictError is returned to that caller.
         On success, the updated Item and Session arrive via itemChanges$ and
         sessionChanges$ respectively, each as a batch of one.
Input:   id:        ItemId
         sessionId: SessionId
Output:  CheckSuccess | CheckConflictError

CheckSuccess {
  type:    'CHECK_SUCCESS'
  item:    Item       // updated item with removed = true
  session: Session    // updated session with new checkedItems entry
}
```

#### uncheckItem
```
Intent:  Reverse a check. Removes the SessionCheckedItem entry from the session log
         and sets removed = false on the item. The item reappears on the active
         list for all users immediately.
         The updated Item and Session arrive via itemChanges$ and sessionChanges$
         respectively, each as a batch of one.
Input:   id:        ItemId
         sessionId: SessionId
Output:  void
Errors:  NotFoundError
```

---

### 5.5 Categories

#### fetchAllCategories
```
Intent:  Fetch all categories for the account once, on app init.
         Seeds the store. Subsequent changes arrive via categoryChanges$.
Input:   none
Output:  Category[]
Errors:  none
```

#### addCategory
```
Intent:  Create a new category.
         The new category is automatically appended to the categoryOrder of all
         existing shops. Explicit exclusion from a shop is a separate operation.
         The new Category arrives via categoryChanges$ as a batch of one.
         All affected Shops arrive via shopChanges$ as a single batch.
Input:   name:  string
         color: string | null   // optional hex color; null = no color
Output:  Category
Errors:  NameConflictError
```

#### renameCategory
```
Intent:  Rename an existing category and/or update its color.
         The updated Category arrives via categoryChanges$ as a batch of one.
Input:   id:    CategoryId
         name:  string
         color: string | null   // optional hex color; null = no color
Output:  Category
Errors:  NotFoundError
         NameConflictError
```

#### deleteCategory
```
Intent:  Delete a category. All items that had this as their primaryCategoryId will
         have that field set to null. All secondaryCategoryIds references to this
         category are removed. The category is removed from all shop categoryOrders.
         Items are not deleted.
         The deleted Category arrives via categoryChanges$ as a batch of one.
         All affected Items arrive via itemChanges$ as a single batch (potentially many).
         All affected Shops arrive via shopChanges$ as a single batch.
Input:   id: CategoryId
Output:  void
Errors:  NotFoundError
```

#### setGlobalCategoryOrder
```
Intent:  Set the global fallback sort order for categories.
         Applied when no shop-specific order exists for the current context.
         All Categories arrive via categoryChanges$ as a single batch reflecting
         their updated globalSortOrder values.
Input:   orderedIds: CategoryId[]   // must include all existing category IDs
Output:  void
Errors:  none
```

---

### 5.6 Shops

#### fetchAllShops
```
Intent:  Fetch all shops for the account once, on app init.
         Seeds the store. Subsequent changes arrive via shopChanges$.
Input:   none
Output:  Shop[]
Errors:  none
```

#### addShop
```
Intent:  Create a new shop. The new shop's categoryOrder is initialised with all
         existing categories in their current global sort order.
         The new Shop arrives via shopChanges$ as a batch of one.
Input:   name:           string
         priceSearchUrl: string | null   // URL template with {query} placeholder; null = skip price lookup
Output:  Shop
Errors:  NameConflictError
```

#### renameShop
```
Intent:  Rename an existing shop.
         The updated Shop arrives via shopChanges$ as a batch of one.
Input:   id:   ShopId
         name: string
Output:  Shop
Errors:  NotFoundError
         NameConflictError
```

#### setShopPriceUrl
```
Intent:  Set or clear the price search URL template for a shop.
         Used by the Manage Shops UI to configure which store page the price
         pipeline scrapes for this shop. The {query} placeholder is substituted
         with the item's search query string at pipeline run time.
         Setting null opts the shop out of pipeline price lookup entirely.
         The updated Shop arrives via shopChanges$ as a batch of one.
Input:   id:  ShopId
         url: string | null
Output:  void
Errors:  NotFoundError
```

#### deleteShop
```
Intent:  Delete a shop and its categoryOrder configuration.
         All items, categories, and sessions are unaffected.
         Sessions that reference this shopId retain the reference for
         historical accuracy but the shop is no longer selectable.
         The deleted Shop arrives via shopChanges$ as a batch of one.
Input:   id: ShopId
Output:  void
Errors:  NotFoundError
```

#### setShopCategoryOrder
```
Intent:  Set the category order for a specific shop.
         Categories absent from orderedIds are considered excluded from this shop —
         they and their items will not appear when shopping at this shop.
         The updated Shop arrives via shopChanges$ as a batch of one.
Input:   shopId:     ShopId
         orderedIds: CategoryId[]   // subset of all categories; excluded ones are omitted
Output:  void
Errors:  NotFoundError
```

---

### 5.7 Sessions

#### fetchActiveSessions
```
Intent:  Fetch all currently active sessions for the account once, on app init.
         Seeds the store. Subsequent changes arrive via sessionChanges$.
Input:   none
Output:  Session[]
Errors:  none
```

#### startSession
```
Intent:  Start or join a shopping session for the given shop.
         At most one active session per shopId per account. If an active
         session already exists for this shopId on the account, the current
         user is added as a participant and the existing session is returned.
         If no active session exists, a new one is created with the current
         user as startedBy and initial participant.
         The new or updated Session arrives via sessionChanges$ as a batch of one.
Input:   shopId: ShopId | null    // null = shopping without a specific shop
Output:  Session
Errors:  SessionConflictError     // edge case only — race condition on concurrent creates
```

#### joinSession
```
Intent:  Add the current user to an existing active session as a participant.
         The updated Session arrives via sessionChanges$ as a batch of one.
Input:   sessionId: SessionId
Output:  Session
Errors:  NotFoundError
```

#### closeSession
```
Intent:  Mark a session as complete. Either participant may close the session.
         Sets completedAt to the current time. The session is retained in history.
         purchaseCount is incremented on all items that appear in checkedItems.
         The completed Session arrives via sessionChanges$ as a batch of one.
         All Items whose purchaseCount was incremented arrive via itemChanges$
         as a single batch — potentially many if several items were checked.
Input:   sessionId: SessionId
Output:  void
Errors:  NotFoundError
```

#### discardSession
```
Intent:  Discard an active session. Ends the session without saving purchase history.
         All checked items are restored to the active list (removed = false, removedAt = null).
         The session's checkedItems are cleared. completedAt is set to the current time.
         purchaseCount is NOT incremented on any item.
         Sessions with zero checkedItems are excluded from history views.
         The completed Session arrives via sessionChanges$ as a batch of one.
         All Items whose removed flag was cleared arrive via itemChanges$
         as a single batch.
Input:   sessionId: SessionId
Output:  void
Errors:  NotFoundError
```

---

### 5.8 Autocomplete

#### fetchAutocompleteItems
```
Intent:  Fetch items eligible for autocomplete suggestion when the user begins
         typing a new item name. Includes all items that have ever existed
         (removed or not), ranked by purchaseCount descending.
         Filtering by the user's current input string is done client-side.
Input:   none
Output:  AutocompleteItem[]

AutocompleteItem {
  id:                ItemId
  name:              string
  quantity:          number | null
  unit:              string | null
  primaryCategoryId: CategoryId | null
  purchaseCount:     number
}
```

Note: Only the fields needed for autocomplete pre-fill are included.
The full Item entity is not returned here.

---

### 5.9 AI Operations

All operations in this domain are no-ops if `Account.aiConfig` is null.
The service implementation enforces this gate — callers do not need to check.

#### requestPriceLookup
```
Intent:  Request a price lookup for an item from the external price pipeline.
         The pipeline (Playwright + Gemma via Ollama) checks shops in the order
         defined by AiConfig.priceLookupShopOrder, scraping each shop's search
         results page and validating the best match via LLM.
         The implementation triggers the pipeline by resetting priceUpdatedAt to null,
         which causes the pipeline's next 30-minute quick-scan cycle to pick up the
         item. Max user-facing latency is one scan interval (typically 30 min).
         On success the pipeline writes directly to Firestore via the same path as
         setItemPrice — the updated Item arrives via itemChanges$ as a batch of one.
         If AiConfig is null, returns AiUnavailableError immediately without contacting
         the pipeline. If the pipeline server is unreachable, the item is queued for
         the next scan cycle and no error surfaces to the caller.
Input:   itemId: ItemId
Output:  void
Errors:  NotFoundError
         AiUnavailableError
```

#### requestListSuggestions
```
Intent:  Ask the AI to evaluate the current list and suggest items to add.
         Items the AI decides to add are created server-side with addedBy = 'ai'
         and arrive via itemChanges$ as a single batch — potentially several new
         items at once.
Input:   none
Output:  void
Errors:  AiUnavailableError
```

---

## Part 6 — Bootup Sequence

On application init, before rendering anything, the app performs the following
sequence through the service layer:

```
1. getAuthState()          — establish whether a user is signed in
   └─ if null → show sign-in screen; halt
   └─ if User → continue

2. getAccount()            — load account and AiConfig into store

3. Parallel fetch (Promise.all):
   fetchActiveList()       — seed items into store
   fetchAllCategories()    — seed categories into store
   fetchAllShops()         — seed shops into store
   fetchActiveSessions()   — seed active sessions into store
   fetchAccountUsers()     — seed users into store (for display name/initials resolution)

4. Subscribe to all change Observables:
   itemChanges$
   categoryChanges$
   shopChanges$
   sessionChanges$
   accountChanges$
   userChanges$
   streamError$
```

Steps 2–3 are one-shot fetches that seed the store. The parallel fetches in step 3
run via `Promise.all` since they are independent — no fetch depends on the result of
another. The stream subscriptions in step 4 are established only after all seed fetches
complete, ensuring the store is never in a partially-seeded state when the first change
events arrive.

No component or effect performs its own initial fetch — all initial data comes from
the bootup sequence.

---

## Appendix — What This Contract Does Not Cover

The following concerns are intentionally outside this contract:

- **Application mode** (plan / shop) — client-side state only; lives in NgRx store;
  not persisted; resets to plan mode on every app start.
- **Settings** (dark mode, language, etc.) — device-local; stored in local storage;
  not synced between users or devices.
- **Checked item undo window** — the 4-second pending window is client-side only,
  visible only to the checking user, and does not involve the API. The committed
  undo history (session's `checkedItems`) is shared across all session participants
  and any participant can undo any check via `uncheckItem`.
- **Session auto-start on shop selection** — orchestrated by an NgRx effect that calls
  `startSession` when the user selects a shop in shop mode. The contract provides
  `startSession`; the triggering logic is a store concern.
- **Optimistic updates** — the store may apply speculative state before a write
  operation resolves. Rollback on error is a store concern. The contract provides
  the typed error values needed to trigger rollback.
- **Price staleness threshold** — the decision of when to call `requestPriceLookup`
  is a store/effect concern. The threshold value is an open design decision
  (working assumption: 6–12 months).
- **AI suggestion motivation refresh** — if the AI re-suggests an existing item,
  the existing `aiMotivation` is reused. Updating motivation on re-suggestion is
  deferred to future scope.
- **Autocomplete filtering** — `fetchAutocompleteItems` returns the full eligible set.
  Filtering against the user's current input is done client-side in the store or
  component, not via a backend query.
- **Autocomplete fetch timing** — `fetchAutocompleteItems` is not part of the bootup
  sequence. It is called lazily on the first time the user opens the add-item flow
  in a session, then cached for the remainder of the session. This avoids fetching
  a potentially large historical item set on every app load, while still ensuring
  suggestions are available before the user finishes typing their first character.
