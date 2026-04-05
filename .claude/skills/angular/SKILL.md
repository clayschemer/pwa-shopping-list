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
- **Signal Forms** — experimental in Angular 21, expected stable in Angular 22. **Do not use until Angular 22.**
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

Every component is standalone. No NgModules.

```typescript
@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './item-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemCardComponent { }
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
@Injectable({ providedIn: 'root' })
export class ItemPriceService {
  private readonly api = inject(ItemApiService);

  setPrice(id: ItemId, price: number | null, qty: number | null, unit: string | null): Promise<void> {
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
export const itemChecked = createAction('[Shop] Item Checked', props<{ itemId: ItemId; sessionId: SessionId }>());
export const itemCheckConflicted = createAction('[Shop] Item Check Conflicted', props<{ itemId: ItemId }>());

// Bad — describes what to do
export const checkItem = createAction('[Items] Check Item', props<{ itemId: ItemId }>());
```

### Reducers — pure, minimal

Reducers only update state. No logic beyond the update. Complex derivation lives in selectors.

```typescript
on(itemsActions.itemAdded, (state, { item }) => itemsAdapter.upsertOne(item, state)),
```

### Selectors — all derived state lives here

If a component is computing something from store data, move it to a selector.

```typescript
export const selectActiveItems = createSelector(
  selectAllItems,
  (items) => items.filter(item => !item.removed)
);
```

### Effects — one concern per effect

Effects call the API, navigate, show notifications. They do not transform data.

```typescript
checkItem$ = createEffect(() =>
  this.actions$.pipe(
    ofType(shopActions.checkItemRequested),
    switchMap(({ itemId, sessionId }) =>
      from(this.itemApi.checkItem(itemId, sessionId)).pipe(
        map(result =>
          result.type === 'CHECK_SUCCESS'
            ? shopActions.itemChecked({ item: result.item, session: result.session })
            : shopActions.itemCheckConflicted({ itemId })
        ),
        catchError(err => of(shopActions.itemCheckFailed({ error: err })))
      )
    )
  )
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
  { path: 'sign-in', loadComponent: () => import('./features/auth/sign-in.component') },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'plan', loadComponent: () => import('./features/plan/plan.component') },
      { path: 'shop', loadComponent: () => import('./features/shop/shop.component') },
    ]
  }
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

## Accessibility

- All interactive elements keyboard reachable
- All icons that convey meaning have `aria-label`
- All form fields have `<label>` or `aria-label`
- Colour is never the only differentiator
- Settings respect `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast` unless user has overridden them
- Test with a screen reader for features with dynamic list updates

---

## Testing

```typescript
// Vitest — test behaviour, not implementation
describe('ItemPriceService', () => {
  it('returns false when priceUpdatedAt is null', () => {
    const service = new ItemPriceService(/* mocked deps */);
    expect(service.isPriceStale({ ...mockItem, priceUpdatedAt: null })).toBe(false);
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

---

## File Naming

| Type | Example |
|---|---|
| Component | `item-card.component.ts` |
| Service | `item-price.service.ts` |
| Actions | `items.actions.ts` |
| Reducer | `items.reducer.ts` |
| Selectors | `items.selectors.ts` |
| Effects | `items.effects.ts` |
| Model | `item.model.ts` |
| Guard | `auth.guard.ts` |
| Test | `item-price.service.spec.ts` |

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

---

## Angular MCP

Use the Angular MCP for current API references before relying on training data. Angular evolves quickly.

- Correct imports for Angular 21 APIs
- Current NgRx patterns (`@ngrx/signals` vs classic NgRx decisions)
- Angular Material 3 component APIs
- Signal API surface (`signal`, `computed`, `effect`, `toSignal`, `input`, `output`)
- Any API that may have changed between Angular 17–21
