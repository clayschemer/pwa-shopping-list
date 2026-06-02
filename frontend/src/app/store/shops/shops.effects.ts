import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, map, switchMap } from 'rxjs';
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

  readonly fetchAllShops$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.shopApi.fetchAllShops()).pipe(
          map((shops) => shopsActions.shopsLoaded({ shops })),
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
        ),
      ),
    ),
  );

  readonly renameShop$ = createEffect(() =>
    this.actions$.pipe(
      ofType(shopsApiActions.renameShopRequested),
      switchMap(({ id, name }) =>
        from(this.shopApi.renameShop(id, name)).pipe(
          map(() =>
            shopsActions.shopRenamed({ shop: { id, name } as Shop }),
          ),
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
        ),
      ),
    ),
  );
}
