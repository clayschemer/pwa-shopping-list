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

## 4. Estimated current spend

Rough, unmeasured, for a two-user household after a year:

- ~400 total items, ~40 active, ~150 completed sessions.
- Cold app open: ~400 (items listener) + ~40 (active list) + small collections
  ≈ **450 reads**.
- 10 opens/day across two users ≈ **4,500 reads**.
- Auto-add, once/day: 150 sessions + 400 items ≈ **550 reads**.
- A 30-item shopping trip, post-fix: ~60 reads plus listener echoes.

Total on the order of **5,000–6,000 reads/day**, against 50,000. That is
comfortable — which is consistent with the app working fine most days, and with
both outages being caused by something anomalous (a runaway container; a
quadratic-ish per-check cost) rather than by baseline usage.

**Implication: the free tier is probably not the binding constraint yet.** It is
the *lack of headroom warning* that hurts — the app goes from fine to dead with
nothing in between.

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

1. **Now:** (A) — instrument, then fix the unfiltered `items` listener and cap
   the history-scaling reads. Cheap, useful whatever else happens, and it is what
   turns this document's guesses into numbers.
2. **Then, once a baseline exists:** (B), on the strength of a measurement rather
   than a fear. Set a Firebase budget alert at the same time. The failure mode
   changes from "app dies for the afternoon" to "an email arrives".
3. **Defer (C) until a trigger fires**, not on a date. Triggers: opening to users
   beyond the household; Blaze costs exceeding a threshold worth naming; or a
   Firestore limitation the app actually hits.

The thing not to do is migrate to escape a quota we have never measured.

---

## 7. Open questions

| # | Question | Needed before |
| - | -------- | ------------- |
| 1 | Actual reads/day, and the split across boot / auto-add / shopping | any hosting decision |
| 2 | Can the `items` listener be filtered without breaking auto-add restores and the shop-mode undo window? | §3(a) |
| 3 | Archive threshold for old removed items — how much history does autocomplete genuinely need? | §3(b) |
| 4 | If Blaze: what monthly figure triggers revisiting (C)? | option B |
| 5 | If self-hosting: does Firebase Auth stay as the identity provider? | option C |
| 6 | Does the price pipeline's read volume belong in this budget, or is it separately capped? | §1 (it caused the July incident) |
