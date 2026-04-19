import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { UiEffects } from './ui.effects';
import { uiActions } from './ui.actions';
import { UserApiService } from '../../core/api/user-api.service';
import type { ShopId } from '../../models/ids.model';

describe('UiEffects', () => {
  let effects: UiEffects;
  let actions$: Subject<unknown>;
  let userApi: { setSelectedShopId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    actions$ = new Subject();
    userApi = {
      setSelectedShopId: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        UiEffects,
        provideMockActions(() => actions$),
        { provide: UserApiService, useValue: userApi },
      ],
    });

    effects = TestBed.inject(UiEffects);
  });

  it('persists selectedShopId on planModeShopSelected', () => {
    effects.persistSelectedShopOnPlanChange$.subscribe();

    actions$.next(uiActions.planModeShopSelected({ shopId: 'shop-1' as ShopId }));

    expect(userApi.setSelectedShopId).toHaveBeenCalledWith('shop-1');
  });

  it('persists null on planModeShopSelected with null', () => {
    effects.persistSelectedShopOnPlanChange$.subscribe();

    actions$.next(uiActions.planModeShopSelected({ shopId: null }));

    expect(userApi.setSelectedShopId).toHaveBeenCalledWith(null);
  });

  it('persists selectedShopId on switchToShopModeWithShop', () => {
    effects.persistSelectedShopOnShopMode$.subscribe();

    actions$.next(uiActions.switchToShopModeWithShop({ shopId: 'shop-2' as ShopId }));

    expect(userApi.setSelectedShopId).toHaveBeenCalledWith('shop-2');
  });
});
