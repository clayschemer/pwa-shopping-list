import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { ItemsEffects, CHECK_UNDO_WINDOW_MS } from './items.effects';
import { itemsActions, itemsApiActions } from './items.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { PriceQueueApiService } from '../../core/api/price-queue-api.service';
import type { ItemId, SessionId } from '../../models/ids.model';

function setVisibilityState(value: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => value,
  });
}

describe('ItemsEffects — undo window', () => {
  let effects: ItemsEffects;
  let actions$: Subject<unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    setVisibilityState('visible');
    actions$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        ItemsEffects,
        provideMockActions(() => actions$),
        {
          provide: ItemApiService,
          useValue: {
            fetchActiveList: vi.fn(),
            addItem: vi.fn(),
            updateItem: vi.fn(),
            removeItem: vi.fn(),
            checkItem: vi.fn(),
            uncheckItem: vi.fn(),
          },
        },
        { provide: PriceQueueApiService, useValue: { enqueue: vi.fn() } },
        provideMockStore(),
      ],
    });
    effects = TestBed.inject(ItemsEffects);
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibilityState('visible');
  });

  it('dispatches checkItemRequested after the undo window expires', () => {
    const results: unknown[] = [];
    effects.checkWindow$.subscribe((a) => results.push(a));
    actions$.next(
      itemsActions.checkItemPending({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS - 1);
    expect(results).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(results).toEqual([
      itemsApiActions.checkItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    ]);
  });

  it('cancels the commit when the user undoes within the window', () => {
    const results: unknown[] = [];
    effects.checkWindow$.subscribe((a) => results.push(a));
    actions$.next(
      itemsActions.checkItemPending({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );
    vi.advanceTimersByTime(2000);
    actions$.next(
      itemsActions.checkItemUndoneDuringWindow({ id: 'i1' as ItemId }),
    );
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS);
    expect(results).toEqual([]);
  });

  it('only cancels the matching item id', () => {
    const results: unknown[] = [];
    effects.checkWindow$.subscribe((a) => results.push(a));
    actions$.next(
      itemsActions.checkItemPending({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );
    actions$.next(
      itemsActions.checkItemUndoneDuringWindow({ id: 'other' as ItemId }),
    );
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS);
    expect(results).toHaveLength(1);
  });

  it('commits the check on visibilitychange when wall-clock has passed the window even if setTimeout never fired', () => {
    vi.setSystemTime(1_000_000);
    const results: unknown[] = [];
    effects.checkWindow$.subscribe((a) => results.push(a));

    actions$.next(
      itemsActions.checkItemPending({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    vi.setSystemTime(1_000_000 + CHECK_UNDO_WINDOW_MS + 1000);
    expect(results).toEqual([]);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(results).toEqual([
      itemsApiActions.checkItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    ]);
  });

  it('reschedules the remaining wall-clock time when the page becomes visible mid-window', () => {
    vi.setSystemTime(1_000_000);
    const results: unknown[] = [];
    effects.checkWindow$.subscribe((a) => results.push(a));

    actions$.next(
      itemsActions.checkItemPending({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    vi.setSystemTime(1_000_000 + 3000);
    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(results).toEqual([]);
    vi.advanceTimersByTime(999);
    expect(results).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(results).toEqual([
      itemsApiActions.checkItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    ]);
  });
});
