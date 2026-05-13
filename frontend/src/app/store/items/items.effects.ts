import { inject, Injectable, NgZone } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

export const CHECK_UNDO_WINDOW_MS = 4000;

function wallClockTimer(durationMs: number, zone: NgZone): Observable<void> {
  return new Observable<void>((subscriber) => {
    const startedAt = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const emit = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      subscriber.next();
      subscriber.complete();
    };

    const scheduleRemaining = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      const remaining = durationMs - (Date.now() - startedAt);
      if (remaining <= 0) {
        emit();
      } else {
        timeoutId = setTimeout(emit, remaining);
      }
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        zone.run(() => scheduleRemaining());
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleRemaining();

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
}
import { itemsActions, itemsApiActions } from './items.actions';
import { sessionsActions } from '../sessions/sessions.actions';
import { accountActions } from '../account/account.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';
import type {
  CheckConflictError,
  NameConflictError,
  NotFoundError,
} from '../../models/errors.model';
import type { CheckSuccess } from '../../core/api/item-api.service';

@Injectable()
export class ItemsEffects {
  private readonly actions$ = inject(Actions);
  private readonly itemApi = inject(ItemApiService);
  private readonly zone = inject(NgZone);

  readonly fetchActiveList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.itemApi.fetchActiveList()).pipe(
          map((items) => itemsActions.itemsLoaded({ items })),
        ),
      ),
    ),
  );

  readonly watchItemChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.itemApi.itemChanges$().pipe(
          map((batch) => {
            const items: Item[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: ItemId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return itemsActions.itemChangesReceived({ items, removed });
          }),
        ),
      ),
    ),
  );

  readonly addItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.addItemRequested),
      switchMap((input) =>
        from(this.itemApi.addItem(input)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return itemsActions.itemNameConflict({ name: input.name });
            }
            return itemsActions.itemAdded({ item: result as Item });
          }),
        ),
      ),
    ),
  );

  readonly updateItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.updateItemRequested),
      switchMap((input) =>
        from(this.itemApi.updateItem(input)).pipe(
          map((result) => {
            const maybeErr = result as NameConflictError | NotFoundError;
            if (maybeErr.type === 'NAME_CONFLICT') {
              return itemsActions.itemNameConflict({ name: input.name });
            }
            if (maybeErr.type === 'NOT_FOUND') {
              return { type: '[Items] Update Not Found (noop)' };
            }
            return itemsActions.itemUpdated({ item: result as Item });
          }),
        ),
      ),
    ),
  );

  readonly removeItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.removeItemRequested),
      switchMap(({ id }) =>
        from(this.itemApi.removeItem(id)).pipe(
          map(() => itemsActions.itemRemoved({ id })),
        ),
      ),
    ),
  );

  readonly checkItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.checkItemRequested),
      mergeMap(({ id, sessionId }) =>
        from(this.itemApi.checkItem(id, sessionId)).pipe(
          mergeMap((result) => {
            if ((result as CheckConflictError).type === 'CHECK_CONFLICT') {
              return of(itemsActions.itemCheckConflict({ id }));
            }
            const success = result as CheckSuccess;
            return of(
              itemsActions.itemChecked({ item: success.item }),
              sessionsActions.sessionUpdated({ session: success.session }),
            );
          }),
        ),
      ),
    ),
  );

  readonly checkWindow$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsActions.checkItemPending),
      mergeMap(({ id, sessionId }) =>
        wallClockTimer(CHECK_UNDO_WINDOW_MS, this.zone).pipe(
          takeUntil(
            this.actions$.pipe(
              ofType(itemsActions.checkItemUndoneDuringWindow),
              filter((a) => a.id === id),
            ),
          ),
          map(() => itemsApiActions.checkItemRequested({ id, sessionId })),
        ),
      ),
    ),
  );

  readonly uncheckItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.uncheckItemRequested),
      switchMap(({ id, sessionId }) =>
        from(this.itemApi.uncheckItem(id, sessionId)).pipe(
          map(() => itemsActions.itemUnchecked({ id })),
        ),
      ),
    ),
  );
}
