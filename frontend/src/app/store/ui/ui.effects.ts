import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, tap } from 'rxjs';
import { uiActions } from './ui.actions';
import { UserApiService } from '../../core/api/user-api.service';

@Injectable()
export class UiEffects {
  private readonly actions$ = inject(Actions);
  private readonly userApi = inject(UserApiService);

  readonly persistSelectedShopOnPlanChange$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(uiActions.planModeShopSelected),
        tap(({ shopId }) => {
          from(this.userApi.setSelectedShopId(shopId)).subscribe();
        }),
      ),
    { dispatch: false },
  );

  readonly persistSelectedShopOnShopMode$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(uiActions.switchToShopModeWithShop),
        tap(({ shopId }) => {
          from(this.userApi.setSelectedShopId(shopId)).subscribe();
        }),
      ),
    { dispatch: false },
  );
}
