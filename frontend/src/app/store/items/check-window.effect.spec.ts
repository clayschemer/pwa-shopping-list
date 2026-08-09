import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { ItemsEffects, CHECK_UNDO_WINDOW_MS } from './items.effects';
import { itemsActions } from './items.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { PriceQueueApiService } from '../../core/api/price-queue-api.service';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';

function setVisibilityState(value: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => value,
  });
}

const checkedItem = (id: string): Item =>
  ({ id: id as ItemId, name: id, removed: true }) as Item;

// The check itself commits immediately; this window only controls how long
// the committed item stays visible as a "has been checked" undo signal.
describe('ItemsEffects — recent-check undo window', () => {
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

  it('dispatches checkUndoWindowElapsed after the undo window expires', () => {
    const results: unknown[] = [];
    effects.recentCheckWindow$.subscribe((a) => results.push(a));
    actions$.next(itemsActions.itemChecked({ item: checkedItem('i1') }));
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS - 1);
    expect(results).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(results).toEqual([
      itemsActions.checkUndoWindowElapsed({ id: 'i1' as ItemId }),
    ]);
  });

  it('stops the window early when the item is unchecked', () => {
    const results: unknown[] = [];
    effects.recentCheckWindow$.subscribe((a) => results.push(a));
    actions$.next(itemsActions.itemChecked({ item: checkedItem('i1') }));
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS / 2);
    actions$.next(itemsActions.itemUnchecked({ id: 'i1' as ItemId }));
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS);
    expect(results).toEqual([]);
  });

  it('only cancels the matching item id', () => {
    const results: unknown[] = [];
    effects.recentCheckWindow$.subscribe((a) => results.push(a));
    actions$.next(itemsActions.itemChecked({ item: checkedItem('i1') }));
    actions$.next(itemsActions.itemUnchecked({ id: 'other' as ItemId }));
    vi.advanceTimersByTime(CHECK_UNDO_WINDOW_MS);
    expect(results).toHaveLength(1);
  });

  it('expires the window on visibilitychange when wall-clock has passed it even if setTimeout never fired', () => {
    vi.setSystemTime(1_000_000);
    const results: unknown[] = [];
    effects.recentCheckWindow$.subscribe((a) => results.push(a));

    actions$.next(itemsActions.itemChecked({ item: checkedItem('i1') }));

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    vi.setSystemTime(1_000_000 + CHECK_UNDO_WINDOW_MS + 1000);
    expect(results).toEqual([]);

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(results).toEqual([
      itemsActions.checkUndoWindowElapsed({ id: 'i1' as ItemId }),
    ]);
  });

  it('reschedules the remaining wall-clock time when the page becomes visible mid-window', () => {
    vi.setSystemTime(1_000_000);
    const results: unknown[] = [];
    effects.recentCheckWindow$.subscribe((a) => results.push(a));

    actions$.next(itemsActions.itemChecked({ item: checkedItem('i1') }));

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    // Hidden for all but the last second of the window, so exactly 1000ms
    // of wall-clock time should remain when the page comes back.
    vi.setSystemTime(1_000_000 + (CHECK_UNDO_WINDOW_MS - 1000));
    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(results).toEqual([]);
    vi.advanceTimersByTime(999);
    expect(results).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(results).toEqual([
      itemsActions.checkUndoWindowElapsed({ id: 'i1' as ItemId }),
    ]);
  });
});
