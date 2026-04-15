import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, map, switchMap } from 'rxjs';
import { itemsActions, itemsApiActions } from './items.actions';
import { accountActions } from '../account/account.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import type { Item } from '../../models/item.model';
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
      switchMap(({ id, sessionId }) =>
        from(this.itemApi.checkItem(id, sessionId)).pipe(
          map((result) => {
            if ((result as CheckConflictError).type === 'CHECK_CONFLICT') {
              return itemsActions.itemCheckConflict({ id });
            }
            return itemsActions.itemChecked({
              item: (result as CheckSuccess).item,
            });
          }),
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
