import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { ItemsEffects, CHECK_UNDO_WINDOW_MS } from './items.effects';
import { itemsActions, itemsApiActions } from './items.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import type { ItemId, SessionId } from '../../models/ids.model';

describe('ItemsEffects — undo window', () => {
  let effects: ItemsEffects;
  let actions$: Subject<unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
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
      ],
    });
    effects = TestBed.inject(ItemsEffects);
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
