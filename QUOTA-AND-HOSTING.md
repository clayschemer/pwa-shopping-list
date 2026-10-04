# QUOTA-AND-HOSTING.md — read budget, and where the backend should live

Opened 2026-09-27, after the third occasion of the app becoming unusable mid-shop
with a message blaming the connection. Purpose: decide whether Firestore's free
tier is a viable home for this app, and if not, what replaces it and when.

**Status: investigation. No hosting decision has been made.** Nothing here is
scheduled work.

---

## 1. Why this document exists

The app has died twice in production in ways that traced back to read volume, not
to code correctness:

- **July 2026** — a stale price-pipeline container burned the daily read quota
  every afternoon; the app failed silently from then until midnight PT.
- **September 2026** — `checkItem` re-read two whole collections after every
  single check. On a thirty-item trip that was thousands of reads spent on data
  already in hand. Fixed; see §3.

Both presented identically to the user: writes failing, "check your connection".
The reporting half of that is now fixed (failures name their real cause — see
CLAUDE.md, *Design for failure*). This document deals with the other half: the
app spends more reads than it needs to, and nobody knows how many.

**The honest position: we do not currently know the daily read volume.** Every
number below §4 is an estimate from reading the code, not a measurement. The
first action is instrumentation, not migration.

---

## 2. The ceiling

Firestore Spark (free) plan, per day:

| Resource         | Free daily allowance |
| ---------------- | -------------------- |
| Document reads   | 50,000               |
| Document writes  | 20,000               |
| Document deletes | 20,000               |
| Stored data      | 1 GiB total          |

When reads run out, Firestore returns `resource-exhausted` for everything —
queries, listeners, and transactions alike — until the quota resets. There is no
degraded mode: the app is simply dead for the rest of the day. That is the failure
mode both incidents produced.

> Verify these figures against the current Firebase pricing page before acting on
> them. They are stated from knowledge that may be out of date.

---

## 3. Known read sites, and how they grow

This is the part worth acting on regardless of any hosting decision. Growth
characteristics matter more than current size, because the collections that grow
without bound are the ones that will exhaust the quota eventually no matter which
plan is chosen.

| Site | Cost per occurrence | Frequency | Growth |
| --- | --- | --- | --- |
| `itemChanges$` listener | **every item ever created** — the listener is attached to the whole `items` collection with no filter | once per cold app open | **unbounded** — items are never hard deleted |
| `fetchAutocompleteItems` | every item ever created | once per session, cached after | **unbounded** |
| Auto-add evaluation | 200 sessions + every item ever created | once per day (daily claim) | capped at 200 sessions; items unbounded |
| `fetchActiveList` | active items only | boot, and on wake after 30 s hidden | bounded by list length |
| `fetchSessionHistory` | as requested | `/history` route | bounded by limit |
| `checkItem` | 2 documents | per check | **fixed** (was unbounded — fixed 2026-09-27) |
| Category / shop listeners + fetches | small collections | boot | bounded |

Two things stand out:

**(a) The `items` listener is unfiltered.** `itemChanges$` subscribes to the
entire `items` collection, so a cold start pays a read for every item the
household has ever owned, not just the ones on the list. This is very likely the
single largest recurring cost in the app, and it grows forever. Filtering it to
`removed == false` is the obvious fix, but it is **not free**: auto-add restores
arrive as `added` rather than `modified`, a checked item leaves the query instead
of being modified in place, and the shop-mode undo window depends on the checked
item lingering locally. Needs its own analysis and its own tests before anyone
touches it.

**(b) "Items are never hard deleted" is load-bearing and expensive.** The
`removed` flag design is right for autocomplete and `purchaseCount`, but it means
three separate read sites scale with total history rather than with the list.
Archiving very old removed items to a separate collection would cap all three at
once, and would not change the logical data model.

**These two fixes may well make the hosting question moot.** They should be
costed before any migration is considered.

---

## 4. Measured spend

Measured 2026-10-04 with `count()` aggregations against the live account, after a
week of the quota being exhausted *every single day* (the price-pipeline log shows
~80 `RESOURCE_EXHAUSTED` cycles per day — it runs dry around 17:00 PT and the app
dies for the evening):

| | count |
| --- | --- |
| Total items | **627** |
| Removed items | **604** |
| Active items | **23** |
| Sessions | **192** |

The ratio is the whole story: **604 removed items against 23 active**. Every read
site that scales with total history pays 27× what the list itself costs.

Against those counts:

| Site | Reads | Notes |
| --- | --- | --- |
| `checkItem`, **pre-fix** | **796 per check** | 604 removed + 192 sessions |
| A 30-item trip, pre-fix | **~24,000** | half the daily quota in one shop |
| `checkItem`, post-fix | **2** | a ~400× reduction |
| Cold boot (`itemChanges$`, unfiltered) | **627** | ~6,300/day at 10 opens |
| Auto-add, once/day | **~820** | 192 sessions + 627 items |
| Price pipeline steady state | **~290/day** | one empty query per 5 min |

**This was never a tier-capacity problem. It was one quadratic call site.** A
single shopping trip spent ~24,000 reads re-reading data the transaction already
held; two trips, or both users checking, exhausted 50,000. Everything else in the
app combined is under 8,000/day.

My earlier estimate in this section guessed ~400 items and ~5–6k reads/day total,
and concluded the free tier was comfortable. The item count was 1.5× off and the
conclusion was wrong for the one reason that mattered: it assumed `checkItem` had
already been fixed in production. It had not been deployed.

**Post-deploy projection: ~7,500 reads/day against 50,000.** Comfortable, and the
largest remaining item becomes the unfiltered items listener at ~6,300/day — §3(a).

---

## 5. Options

### A. Stay on the free tier, fix the growth sites, add instrumentation
Do §3(a) and §3(b), and record per-boot read counts the way auto-add already
records its own timings. Cost: nothing. Buys: a known baseline and a much flatter
growth curve.

**This is the recommended first step, and it is independent of every option
below.** None of the others should be chosen before the baseline exists.

### B. Upgrade to Blaze (pay-as-you-go), keep Firestore
Same code, same rules, no migration. Quota stops being a cliff; it becomes a
bill. Order of magnitude: reads are around **$0.06 per 100,000** (verify), so
even 10× the estimated spend is cents per month for a two-user app.

- **For:** zero engineering effort; removes the "app dies at 4pm" failure mode
  entirely; keeps the realtime model the app is built around.
- **Against:** an unbounded bill where there used to be an unbounded outage. A
  runaway process — exactly what caused the July incident — now spends money
  silently instead of failing loudly. **A budget alert is mandatory, not
  optional**, and even then it only alerts, it does not cap.
- **Note:** this contradicts nothing in the existing architecture. It is the
  cheapest way to remove the cliff.

### C. Self-host: Go or Java + PostgreSQL + SSE
Already the documented long-term direction (`BACKEND.md` §Future Backend). Only
`frontend/src/app/core/api/` changes; the API contract, store, and components do
not.

- **For:** no per-read pricing at all; full control; the `EntityChangeBatch<T>`
  stream contract was designed to be satisfiable by SSE, so this is a planned
  path rather than a rewrite.
- **Against:** real operational work that currently does not exist — a host,
  Postgres backups, TLS, auth (Firebase Auth would go too, or stay as an identity
  provider only), a deploy pipeline beyond the current GH Pages/cPanel setup, and
  someone on the hook when it breaks at 7am. For two users this is almost
  certainly premature; the free tier plus §3 fixes costs nothing and needs no
  babysitting.
- **When it becomes right:** if the app opens to wider availability, or if
  per-read costs under Blaze ever become non-trivial.

### D. Managed Postgres + a thin API (Supabase, Neon, Fly.io, etc.)
Middle ground: keeps SQL and realtime, less operational load than (C), still a
service-layer rewrite. Worth a look only if (C) is chosen on principle but the
ops burden is the blocker.

---

## 6. Recommendation

0. **Deploy the `checkItem` fix.** Done in code, not yet in production as of
   2026-10-04. This is ~95% of the problem; nothing else on this list comes close.
1. **Then:** (A) — the unfiltered items listener at ~6,300 reads/day is now the
   largest remaining cost, and archiving old removed items caps three sites at
   once. Still cheap, still useful whatever else happens.
2. **(B) is not currently justified.** Post-deploy projection is ~7,500/day
   against 50,000 — the tier was never the constraint. Revisit only if measured
   spend actually approaches the ceiling. A budget alert is still worth having if
   Blaze is ever enabled, since the failure mode becomes a bill rather than an
   outage.
3. **Defer (C) until a trigger fires**, not on a date. Triggers: opening to users
   beyond the household; Blaze costs exceeding a threshold worth naming; or a
   Firestore limitation the app actually hits.

The thing not to do is migrate to escape a quota that one quadratic call site was
spending on our behalf. **Measure the call sites before changing the plan** — that
lesson cost a week of evenings with an unusable list, and this document spent its
first draft recommending a hosting change for a bug.

---

## 7. Open questions

| # | Question | Needed before |
| - | -------- | ------------- |
| 1 | ~~Actual reads/day, and the split across boot / auto-add / shopping~~ — **answered 2026-10-04, see §4** | — |
| 2 | Can the `items` listener be filtered without breaking auto-add restores and the shop-mode undo window? | §3(a) |
| 3 | Archive threshold for old removed items — how much history does autocomplete genuinely need? | §3(b) |
| 4 | If Blaze: what monthly figure triggers revisiting (C)? | option B |
| 5 | If self-hosting: does Firebase Auth stay as the identity provider? | option C |
| 6 | Does the price pipeline's read volume belong in this budget, or is it separately capped? | §1 (it caused the July incident) |
