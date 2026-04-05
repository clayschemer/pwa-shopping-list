import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { defer, from, map, switchMap } from 'rxjs';
import { shopsApiActions } from './shops.actions';
import { ShopApiService } from '../../core/api/shop-api.service';
import { ChangeStreamService } from '../../core/stream/change-stream.service';

@Injectable()
export class ShopsEffects {
  private readonly actions$ = inject(Actions);
  private readonly shopApi = inject(ShopApiService);
  private readonly streams = inject(ChangeStreamService);

  readonly loadShops$ = createEffect(() =>
    this.actions$.pipe(
      ofType('@ngrx/effects/init' as never),
      switchMap(() =>
        from(this.shopApi.fetchAllShops()).pipe(
          map((shops) => shopsApiActions.fetchAllShopsSuccess({ shops })),
        ),
      ),
    ),
  );

  readonly shopStream$ = createEffect(() =>
    defer(() => this.streams.shopChanges$).pipe(
      map((changes) => shopsApiActions.shopStreamUpdated({ changes })),
    ),
  );
}
