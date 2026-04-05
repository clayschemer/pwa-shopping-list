import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { defer, from, map, switchMap } from 'rxjs';
import { itemsActions, itemsApiActions } from './items.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { ChangeStreamService } from '../../core/stream/change-stream.service';
import type { Item } from '../../models/item.model';
import type { NameConflictError } from '../../models/errors.model';

@Injectable()
export class ItemsEffects {
  private readonly actions$ = inject(Actions);
  private readonly itemApi = inject(ItemApiService);
  private readonly streams = inject(ChangeStreamService);

  readonly loadItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType('@ngrx/effects/init' as never),
      switchMap(() =>
        from(this.itemApi.fetchActiveList()).pipe(
          map((items) => itemsApiActions.fetchActiveListSuccess({ items })),
        ),
      ),
    ),
  );

  readonly itemStream$ = createEffect(() =>
    defer(() => this.streams.itemChanges$).pipe(
      map((changes) => itemsApiActions.itemStreamUpdated({ changes })),
    ),
  );

  readonly addItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsActions.addItemRequested),
      switchMap((action) =>
        from(
          this.itemApi.addItem({
            name: action.name,
            description: action.description,
            quantity: action.quantity,
            unit: action.unit,
            primaryCategoryId: action.primaryCategoryId,
            secondaryCategoryIds: action.secondaryCategoryIds,
          }),
        ).pipe(
          map((result) =>
            (result as NameConflictError).type === 'NAME_CONFLICT'
              ? itemsApiActions.addItemNameConflict({ name: action.name })
              : itemsApiActions.addItemSuccess({ item: result as Item }),
          ),
        ),
      ),
    ),
  );

  readonly removeItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsActions.removeItemRequested),
      switchMap(({ id }) =>
        from(this.itemApi.removeItem(id)).pipe(
          map(() => itemsApiActions.removeItemSuccess({ id })),
        ),
      ),
    ),
  );

  readonly updateItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsActions.updateItemRequested),
      switchMap((action) =>
        from(
          this.itemApi.updateItem({
            id: action.id,
            name: action.name,
            description: action.description,
            quantity: action.quantity,
            unit: action.unit,
            primaryCategoryId: action.primaryCategoryId,
            secondaryCategoryIds: action.secondaryCategoryIds,
          }),
        ).pipe(
          map((result) =>
            (result as NameConflictError).type === 'NAME_CONFLICT'
              ? itemsApiActions.updateItemNameConflict({ name: action.name })
              : itemsApiActions.updateItemSuccess({ item: result as Item }),
          ),
        ),
      ),
    ),
  );
}
