import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { shopsActions, shopsApiActions } from './shops.actions';
import { accountActions } from '../account/account.actions';
import { ShopApiService } from '../../core/api/shop-api.service';
import type { Shop } from '../../models/shop.model';
import type { ShopId } from '../../models/ids.model';
import type { NameConflictError } from '../../models/errors.model';

@Injectable()
export class ShopsEffects {
  private readonly actions$ = inject(Actions);
  private readonly shopApi = inject(ShopApiService);

  // The initial fetch fails OPEN: `selectListDataLoaded` gates the whole list
  // on every slice reporting loaded, so a rejected fetch that dispatched a
  // failure action instead would hang the list on a skeleton for the rest of
  // the session.
  readonly fetchAllShops$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.shopApi.fetchAllShops()).pipe(
          map((shops) => shopsActions.shopsLoaded({ shops })),
          catchError(() => of(shopsActions.shopsLoaded({ shops: [] }))),
        ),
      ),
    ),
  );

  readonly watchShopChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.shopApi.shopChanges$().pipe(
          map((batch) => {
            const shops: Shop[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: ShopId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return shopsActions.shopChangesReceived({ shops, removed });
          }),
        ),
      ),
    ),
  );

  // Every API-calling effect handles rejection INSIDE the flattening operator:
  // a rejected promise (offline / flaky in-store connectivity) must dispatch a
  // failure action, never error the outer stream — an errored effect is
  // resubscribed at most 10 times by NgRx and then dies silently for the rest
  // of the session.
  readonly addShop$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.addShopRequested),
      switchMap(({ name }) =>
        from(this.shopApi.addShop(name)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Shops] Add Shop Conflict (noop)' };
            }
            return shopsActions.shopAdded({ shop: result as Shop });
          }),
          catchError(() => of(shopsActions.shopSaveFailed({ id: null }))),
        ),
      ),
    ),
  );

  readonly renameShop$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.renameShopRequested),
      switchMap(({ id, name }) =>
        from(this.shopApi.renameShop(id, name)).pipe(
          map(() => shopsActions.shopRenamed({ shop: { id, name } as Shop })),
          catchError(() => of(shopsActions.shopSaveFailed({ id }))),
        ),
      ),
    ),
  );

  readonly deleteShop$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.deleteShopRequested),
      switchMap(({ id }) =>
        from(this.shopApi.deleteShop(id)).pipe(
          map(() => shopsActions.shopDeleted({ id })),
          catchError(() => of(shopsActions.shopSaveFailed({ id }))),
        ),
      ),
    ),
  );

  readonly setShopCategoryOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.setShopCategoryOrderRequested),
      switchMap(({ shopId, orderedIds }) =>
        from(this.shopApi.setShopCategoryOrder(shopId, orderedIds)).pipe(
          map(() => shopsActions.shopCategoryOrderSet({ shopId, orderedIds })),
          catchError(() => of(shopsActions.shopSaveFailed({ id: shopId }))),
        ),
      ),
    ),
  );

  readonly setShopPriceUrl$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.setShopPriceUrlRequested),
      switchMap(({ id, url }) =>
        from(this.shopApi.setShopPriceUrl(id, url)).pipe(
          map(() => shopsActions.shopPriceUrlSet({ id, url })),
          catchError(() => of(shopsActions.shopSaveFailed({ id }))),
        ),
      ),
    ),
  );

  readonly setShopOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.setShopOrderRequested),
      switchMap(({ orderedIds }) =>
        from(this.shopApi.setShopOrder(orderedIds)).pipe(
          map(() => accountActions.shopOrderUpdated({ orderedIds })),
          catchError(() => of(shopsActions.shopSaveFailed({ id: null }))),
        ),
      ),
    ),
  );
}
