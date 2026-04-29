---
name: angular
description: Angular conventions, architecture patterns, and project structure for Angular 21+ projects using NgRx, Angular Material 3, and standalone components. Use this skill whenever writing or reviewing any Angular code — components, services, store, effects, selectors, guards, pipes, routing, or tests. Also use when making decisions about where logic should live (component vs service vs store), how to structure a feature, or how to split a service that has grown too large. Covers the Fat Services / Thin Components / Dumb Templates pattern, OOP service design, signals, and Vitest testing conventions.
---

# Angular Conventions

Read this file whenever working on any Angular code: components, services, store, effects, guards, pipes, or tests.

---

## Stack

- **Angular 21** — standalone components, typed forms, no SSR
- **Angular 22** upgrade expected May 2026
- **Signal Forms** — experimental in Angular 21, expected stable in Angular 22. Should be used eventhough experimental status.
- **NgRx** — classic `@ngrx/store` + `@ngrx/effects` for main application state; `@ngrx/signals` where appropriate for local feature state
- **Angular Material 3** — all UI primitives
- **Vitest** — unit and component tests

---

## Core Philosophy: Fat, Dumb, and Happy

This project follows the **Fat Services, Thin Components, Dumb Templates** pattern. Code that is consistent and predictable in where it lives is readable, testable, and maintainable.

### Templates — dumb and declarative

Templates say **what** to show, never **how** to get it. Logic does not belong in templates.

- No expressions with `&&`, `||`, or method calls that compute anything — move those to the component
- No direct service access from the template — services are always `private` on the component class
- Sub-components should assume they receive valid data; the parent template handles `@if` guards
- Prefer many small specific template bindings over a single generic one

### Components — thin and smart

Components are the decision-makers. They know what needs to happen and delegate to services to make it happen. They contain **code that decides**, not code that processes.

Every component must use separate template and style files — never inline `template` or `styles` in the decorator. Each component consists of exactly three files: `*.component.ts`, `*.component.html`, and `*.component.scss`. Use `templateUrl` and `styleUrl` in `@Component`.

> Component: Code that DECIDES. Service: Code that PROCESSES.

A component should be as thin as possible, but no thinner. When choosing between handling something in a component or a service, default to the service — but do not move decision logic there.

- Handle user events with small, specific methods (`done()`, `remove()`) not generic dispatchers (`handle(action)`)
- Keep services `private` in `inject()` calls — the template never touches them directly
- Do not put processing, transformation, or business logic in a component
- Local UI state (expanded, hover, undo countdown) lives here as signals; shared application state lives in the store

### Services — fat and happy (specific)

Services carry the weight. Business logic, data processing, transformation, HTTP calls, domain rules — all of it goes into services. When in doubt whether code belongs in a component or a service, put it in the service.

**Fat** means: services hold all the processing code. They can and should be substantial.

**Happy** means: each service does one thing and does it well. A fat service that handles multiple unrelated concerns is not happy — split it.

> Services should do one thing and do it well.

Services are either fully **stateful** (managing a slice of state, e.g. a presenter or store wrapper) or fully **stateless** (pure processing functions with no internal state). Never mix the two in the same service.

### OOP service design

Services are classes. Use them like classes.

- Encapsulate related behaviour behind a clean public interface
- Keep private methods private — `private` is not optional
- Inject dependencies via `inject()` at field declaration; keep injected services private
- Prefer composition over inheritance; use inheritance only when there is a genuine is-a relationship
- Favour pure functions inside stateless services — same input, same output, no side effects

### Service splitting discipline

A service that handles more than one bounded concern needs to be split. Signs it is time:

- Methods that do not share any private state with each other
- A method name that does not clearly belong to the service's stated purpose
- Injecting another service only for one unrelated group of methods

There is no line-count rule. The smell is mixed concerns, not file length.

---

## Project Structure

```
src/
├── app/
│   ├── core/                         # App-wide singletons — provided in root
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   └── auth.models.ts
│   │   ├── api/                      # API service layer — the only place backend is touched
│   │   │   ├── item-api.service.ts
│   │   │   ├── category-api.service.ts
│   │   │   ├── shop-api.service.ts
│   │   │   ├── session-api.service.ts
│   │   │   └── account-api.service.ts
│   │   └── stream/
│   │       └── change-stream.service.ts
│   │
│   ├── store/                        # NgRx store: state, actions, reducers, selectors, effects
│   │   ├── app.state.ts
│   │   ├── items/
│   │   │   ├── items.actions.ts
│   │   │   ├── items.reducer.ts
│   │   │   ├── items.selectors.ts
│   │   │   └── items.effects.ts
│   │   ├── categories/
│   │   ├── shops/
│   │   ├── sessions/
│   │   ├── account/
│   │   └── ui/                       # Client-only UI state (mode, selected shop, etc.)
│   │       ├── ui.actions.ts
│   │       ├── ui.reducer.ts
│   │       └── ui.selectors.ts
│   │
│   ├── features/                     # One folder per feature
│   │   ├── auth/
│   │   ├── plan/
│   │   ├── shop/
│   │   ├── settings/
│   │   └── shared/                   # Shared presentational components (no store access)
│   │
│   ├── models/                       # Domain types
│   │   └── *.model.ts
│   │
│   └── app.config.ts                 # provideRouter, provideStore, provideEffects, etc.
```

---

## Components

### Standalone only

Every component is standalone. No NgModules. Do not include `standalone: true` — it is the default since Angular 19 and the explicit flag is redundant noise.

```typescript
@Component({
  selector: "app-item-card",
  imports: [MatCardModule, MatIconModule],
  templateUrl: "./item-card.component.html",
  styleUrl: "./item-card.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemCardComponent {}
```

### OnPush everywhere

`ChangeDetectionStrategy.OnPush` on every component, no exceptions. If a component is not updating when expected, the answer is signals or an async pipe — not removing OnPush.

### Input and output conventions

Use signal-based `input()` and `output()` — not `@Input()` / `@Output()` decorators:

```typescript
readonly item = input.required<Item>();
readonly removed = output<ItemId>();
```

### Component responsibilities

Components decide, they do not process. A component method calls a service or dispatches an action — it does not contain the logic itself.

- Prefer many small specific methods (`done()`, `remove()`) over a single generic handler (`handle(action)`)
- Do not transform data in a component — pass it to a service or derive it in a selector
- Do not manage async subscriptions manually — use `toSignal()` or the `async` pipe
- Do not call a service method that returns data and render it directly — route shared data through the store

### Loading states — skeleton loaders

Views that depend on async data (store selectors with a `loaded` flag) must show **skeleton loaders** — not spinners — while waiting for data. Skeletons mimic the layout of the real content so the page does not shift on load.

- Use the `selectListDataLoaded` cross-domain selector (combines items + categories + shops loaded flags) for list views
- Use `selectIsAuthChecking` for views that depend only on account/auth state
- Skeleton markup lives in the component template behind `@if (!loaded())`, with `aria-hidden="true"`
- Skeleton SCSS uses `@use '../../../styles/skeleton';` and `@include skeleton.pulse;` on each placeholder element
- The pulse animation is automatically suppressed under `prefers-reduced-motion` (static grey blocks remain visible)
- Skeleton layout must reflect the real content structure — group containers, row heights, and spacing should match
- Use varying widths on placeholders (e.g. 40%, 60%, 5rem) to suggest mixed content lengths

**Template pattern:**
```html
@if (!loaded()) {
  <div class="app-feature__skeleton" aria-hidden="true">
    <!-- skeleton markup mimicking real layout -->
  </div>
} @else if (items().length === 0) {
  <p class="app-feature__empty">...</p>
} @else {
  <!-- real content -->
}
```

Do **not** use `MatProgressSpinner` for page-level content loading. Spinners are acceptable only for inline action feedback (e.g. a submit button).

### Container vs presentational split

- **Container components** connect to the store. They select state and dispatch actions.
- **Presentational components** receive inputs and emit outputs. Same inputs → same render. No store access.

---

## Services

### One concern per service

Name services after their bounded concern. If the name feels vague, the scope probably is too.

### Stateful vs stateless — never mixed

- **Stateful**: manages a slice of state. Has internal fields that change over time.
- **Stateless**: pure processing functions. No internal mutable state. API services are stateless.

### Provide at root unless scoped

Use `providedIn: 'root'` for all singleton services. Only use feature-level providing for services that must be destroyed with a route.

### Shape

```typescript
@Injectable({ providedIn: "root" })
export class ItemPriceService {
  private readonly api = inject(ItemApiService);

  setPrice(
    id: ItemId,
    price: number | null,
    qty: number | null,
    unit: string | null,
  ): Promise<void> {
    return this.api.setItemPrice(id, price, qty, unit);
  }

  isPriceStale(item: Item): boolean {
    if (item.priceUpdatedAt === null) return false;
    return Date.now() - item.priceUpdatedAt > PRICE_STALENESS_THRESHOLD_MS;
  }

  private formatPrice(item: Item): string {
    // private — not part of the public interface
  }
}
```

### API service layer

The API service layer is a strict abstraction boundary. Nothing outside `core/api/` touches the backend SDK.

- Implement the API contract exactly — return typed entities, never raw backend documents
- Normalise all timestamps to Unix milliseconds before returning
- Translate backend errors into typed discriminated union error values

---

## NgRx Store

### Structure per domain

Each domain gets its own folder under `store/` with four files: `actions`, `reducer`, `selectors`, `effects`. Don't merge domains to save files.

### Actions — intent, not implementation

```typescript
// Good — describes what happened
export const itemChecked = createAction(
  "[Shop] Item Checked",
  props<{ itemId: ItemId; sessionId: SessionId }>(),
);
export const itemCheckConflicted = createAction(
  "[Shop] Item Check Conflicted",
  props<{ itemId: ItemId }>(),
);

// Bad — describes what to do
export const checkItem = createAction(
  "[Items] Check Item",
  props<{ itemId: ItemId }>(),
);
```

### Reducers — pure, minimal

Reducers only update state. No logic beyond the update. Complex derivation lives in selectors.

```typescript
on(itemsActions.itemAdded, (state, { item }) => itemsAdapter.upsertOne(item, state)),
```

### Selectors — all derived state lives here

If a component is computing something from store data, move it to a selector.

```typescript
export const selectActiveItems = createSelector(selectAllItems, (items) =>
  items.filter((item) => !item.removed),
);
```

### State initialisation

- Always define explicit `initialState` with safe defaults for every field
- Use `loaded` flags to distinguish "empty because not fetched" from "empty because genuinely empty"
- Effects that fetch data must only fire after their prerequisites are met (e.g., `accountLoaded` for entity effects) — never use `@ngrx/effects/init` for data fetches that require authentication
- Fire-and-forget promises are forbidden — always `await` or handle the result in the observable chain

### Effects — one concern per effect

Effects call the API, navigate, show notifications. They do not transform data.

```typescript
checkItem$ = createEffect(() =>
  this.actions$.pipe(
    ofType(shopActions.checkItemRequested),
    switchMap(({ itemId, sessionId }) =>
      from(this.itemApi.checkItem(itemId, sessionId)).pipe(
        map((result) =>
          result.type === "CHECK_SUCCESS"
            ? shopActions.itemChecked({
                item: result.item,
                session: result.session,
              })
            : shopActions.itemCheckConflicted({ itemId }),
        ),
        catchError((err) => of(shopActions.itemCheckFailed({ error: err }))),
      ),
    ),
  ),
);
```

### No raw dispatch in components

Always use typed action creators. Components select and dispatch — nothing else.

---

## Signals

```typescript
// Local UI state — signals
readonly isExpanded = signal(false);
readonly undoTimeRemaining = signal<number | null>(null);

// Bridge store observable to signal
readonly activeItems = toSignal(this.store.select(selectActiveItems), { initialValue: [] });

// Derived signal state
readonly hasItems = computed(() => this.activeItems().length > 0);
```

Local UI state → signals. Shared application state → NgRx.

---

## Routing

```typescript
export const routes: Routes = [
  {
    path: "sign-in",
    loadComponent: () => import("./features/auth/sign-in.component"),
  },
  {
    path: "",
    canActivate: [authGuard],
    children: [
      {
        path: "plan",
        loadComponent: () => import("./features/plan/plan.component"),
      },
      {
        path: "shop",
        loadComponent: () => import("./features/shop/shop.component"),
      },
    ],
  },
];
```

Use `loadComponent` for lazy routes. No lazy modules.

---

## Angular Material 3

- Import only the specific modules needed — never `MatLegacy*`
- Use M3 theme tokens for colour, not hardcoded hex
- `mat-icon` with `aria-label` on every icon that conveys meaning
- `MatSnackBar` for transient feedback; `MatDialog` for confirmations
- No `::ng-deep` — use CSS custom properties to override Material styles

---

## Accessibility — WCAG 2.1 AA

Full compliance is non-negotiable. Every component must meet these requirements:

### Semantic HTML
- Landmark roles: `<main>`, `<nav>`, `<header>`, `<footer>` used semantically — one `<main>` per page
- Heading hierarchy: one `<h1>` per page, no skipped levels (`h1` → `h2` → `h3`, never `h1` → `h3`)
- Lists (`<ul>`, `<ol>`) for groups of related items
- `<button>` for actions, `<a>` for navigation — never the reverse

### Forms
- Every form input has a visible `<label>` associated via `for`/`id`, or `aria-label`/`aria-labelledby`
- Error messages associated via `aria-describedby`
- `aria-live="polite"` on error regions for dynamic error display
- `autocomplete` attributes on identity fields (`email`, `current-password`, `name`, etc.)
- Validation feedback on submit, not on blur (less disruptive)
- `aria-busy="true"` on submit buttons during async operations
- `aria-invalid="true"` on inputs with validation errors

### Interactive elements
- All interactive elements keyboard reachable and operable
- Focus order matches visual order (no positive `tabindex`)
- `:focus-visible` indicator on every interactive element
- Touch targets ≥ 2.75rem (44×44px equivalent)
- Icon-only buttons have `aria-label`
- Decorative icons have `aria-hidden="true"`

### Dynamic content
- `aria-live="polite"` for content updates (toasts, inline errors, status changes)
- `aria-live="assertive"` only for critical alerts
- Colour is never the only differentiator — always pair with text, icon, or pattern

### Media preferences
- `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast` always respected
- User-explicit overrides take precedence over system preferences
- Test with a screen reader for features with dynamic list updates

---

## Progressive Enhancement & Responsive Design

### Mobile-first
- Base styles target the smallest viewport (320px minimum)
- Every layout must work from 320px to unlimited width
- No horizontal scroll at any viewport width

### No global breakpoints — component-level responsiveness
- **Do not use media query breakpoints** (`@media (min-width: ...)`) for layout changes. This approach is outdated and brittle.
- Use **container queries** (`@container`) so each component adapts to its own available space, not the viewport.
- Use **fluid techniques** (`clamp()`, `min()`, `max()`, `%`, `fr`) for sizing that scales continuously.
- Use **intrinsic sizing** (`min-content`, `max-content`, `fit-content`) where appropriate.
- Media queries are only acceptable for user preference features (`prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`, `pointer`).

### Progressive enhancement
- Core content is accessible with CSS only — JS enhances the experience
- Graceful degradation: features that need JS still render meaningful HTML without it
- Use semantic HTML as the foundation — styles and scripts layer on top

### Touch & pointer
- Touch targets ≥ 2.75rem on all interactive elements
- Pointer-fine media query for hover-dependent interactions on desktop
- No hover-only interactions — everything must be tap/click accessible

---

## Testing

```typescript
// Vitest — test behaviour, not implementation
describe("ItemPriceService", () => {
  it("returns false when priceUpdatedAt is null", () => {
    const service = new ItemPriceService(/* mocked deps */);
    expect(service.isPriceStale({ ...mockItem, priceUpdatedAt: null })).toBe(
      false,
    );
  });
});

// Component tests — seed the store, don't mock selectors
TestBed.configureTestingModule({
  imports: [ItemCardComponent],
  providers: [provideStore({ items: itemsReducer })],
});
```

- Test observable outcomes, not private method calls
- Mock at the API service layer boundary
- Never mock signals — set their value directly
- Every bug fix must start with a failing test that reproduces the bug
- Every new feature starts with the acceptance test scenario, then unit tests, then implementation
- Reducers must be tested with explicit state transitions, not just initial state checks

---

## File Naming

| Type      | Example                      |
| --------- | ---------------------------- |
| Component | `item-card.component.ts`     |
| Service   | `item-price.service.ts`      |
| Actions   | `items.actions.ts`           |
| Reducer   | `items.reducer.ts`           |
| Selectors | `items.selectors.ts`         |
| Effects   | `items.effects.ts`           |
| Model     | `item.model.ts`              |
| Guard     | `auth.guard.ts`              |
| Test      | `item-price.service.spec.ts` |

---

## Do Not

- Use `NgModule` — standalone only
- Use `any` — use `unknown` + narrowing when type is genuinely uncertain
- Use `@Input()` / `@Output()` decorators — use `input()` / `output()` signal functions
- Remove `OnPush` to fix a change detection problem
- Subscribe manually in components — use `toSignal()` or `async` pipe
- Let a component call a service method that returns data and render it directly
- Import any backend SDK outside of `core/api/`
- Use `console.log` in committed code
- Write an NgRx effect that manipulates DOM or component state
- Use `Subject` or `BehaviorSubject` for store-level state
- Use inline `template` or `styles` in `@Component` — use `templateUrl` and `styleUrl` with separate files
- Write `if`/`else` bodies without braces — always use curly braces even for single-line bodies
- Include `standalone: true` in `@Component` — all components are standalone by default in Angular 19+
- Use browser `prompt()`, `alert()`, or `confirm()` — use Material Dialog or Bottom Sheet
- Dispatch actions that change unrelated state (e.g., changing mode when only layout selection is intended)
- Show navigation chrome or app shell on unauthenticated screens — conditional rendering must gate the shell
- Use `@ngrx/effects/init` to trigger data fetches that require authentication

---

## Angular MCP

Use the Angular MCP for current API references before relying on training data. Angular evolves quickly.

- Correct imports for Angular 21 APIs
- Current NgRx patterns (`@ngrx/signals` vs classic NgRx decisions)
- Angular Material 3 component APIs
- Signal API surface (`signal`, `computed`, `effect`, `toSignal`, `input`, `output`)
- Any API that may have changed between Angular 17–21
