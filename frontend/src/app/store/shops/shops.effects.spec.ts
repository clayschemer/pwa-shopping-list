import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { ShopsEffects } from './shops.effects';
import { shopsActions, shopsApiActions } from './shops.actions';
import { accountActions } from '../account/account.actions';
import { ShopApiService } from '../../core/api/shop-api.service';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const mockShops: Shop[] = [
  { id: 's1' as ShopId, accountId: 'a1' as AccountId, name: 'Tesco', categoryOrder: [] },
  { id: 's2' as ShopId, accountId: 'a1' as AccountId, name: 'Lidl', categoryOrder: [] },
];

const mockAccount = { id: 'a1' as AccountId, name: 'Test', aiConfig: null };

describe('ShopsEffects', () => {
  let effects: ShopsEffects;
  let actions$: Subject<unknown>;
  let shopApi: {
    fetchAllShops: ReturnType<typeof vi.fn>;
    addShop: ReturnType<typeof vi.fn>;
    renameShop: ReturnType<typeof vi.fn>;
    deleteShop: ReturnType<typeof vi.fn>;
    setShopCategoryOrder: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    shopApi = {
      fetchAllShops: vi.fn(),
      addShop: vi.fn(),
      renameShop: vi.fn(),
      deleteShop: vi.fn(),
      setShopCategoryOrder: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ShopsEffects,
        provideMockActions(() => actions$),
        { provide: ShopApiService, useValue: shopApi },
      ],
    });

    effects = TestBed.inject(ShopsEffects);
  });

  describe('fetchAllShops$', () => {
    it('dispatches shopsLoaded on accountLoaded', () => {
      shopApi.fetchAllShops.mockResolvedValue(mockShops);

      const results: unknown[] = [];
      effects.fetchAllShops$.subscribe((action) => results.push(action));

      actions$.next(accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shopApi.fetchAllShops).toHaveBeenCalled();
          expect(results).toEqual([
            shopsActions.shopsLoaded({ shops: mockShops }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('setShopCategoryOrder$', () => {
    it('dispatches shopCategoryOrderSet on success', () => {
      shopApi.setShopCategoryOrder.mockResolvedValue(undefined);

      const results: unknown[] = [];
      effects.setShopCategoryOrder$.subscribe((action) => results.push(action));

      const orderedIds = ['c2' as CategoryId, 'c1' as CategoryId];
      actions$.next(
        shopsApiActions.setShopCategoryOrderRequested({
          shopId: 's1' as ShopId,
          orderedIds,
        }),
      );

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shopApi.setShopCategoryOrder).toHaveBeenCalledWith('s1', orderedIds);
          expect(results).toEqual([
            shopsActions.shopCategoryOrderSet({ shopId: 's1' as ShopId, orderedIds }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('addShop$', () => {
    it('dispatches shopAdded on successful add', () => {
      const newShop: Shop = {
        id: 's3' as ShopId,
        accountId: 'a1' as AccountId,
        name: 'Aldi',
        categoryOrder: [],
      };
      shopApi.addShop.mockResolvedValue(newShop);

      const results: unknown[] = [];
      effects.addShop$.subscribe((action) => results.push(action));

      actions$.next(shopsApiActions.addShopRequested({ name: 'Aldi' }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shopApi.addShop).toHaveBeenCalledWith('Aldi');
          expect(results).toEqual([
            shopsActions.shopAdded({ shop: newShop }),
          ]);
          resolve();
        });
      });
    });

    it('does not dispatch shopAdded on name conflict', () => {
      shopApi.addShop.mockResolvedValue({
        type: 'NAME_CONFLICT',
        entityKind: 'shop',
        name: 'Tesco',
      });

      const results: unknown[] = [];
      effects.addShop$.subscribe((action) => results.push(action));

      actions$.next(shopsApiActions.addShopRequested({ name: 'Tesco' }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(results.length).toBe(1);
          expect((results[0] as { type: string }).type).not.toContain('Shop Added');
          resolve();
        });
      });
    });
  });

  describe('renameShop$', () => {
    it('calls renameShop API on request', () => {
      shopApi.renameShop.mockResolvedValue(undefined);

      const results: unknown[] = [];
      effects.renameShop$.subscribe((action) => results.push(action));

      actions$.next(shopsApiActions.renameShopRequested({ id: 's1' as ShopId, name: 'Tesco Express' }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shopApi.renameShop).toHaveBeenCalledWith('s1', 'Tesco Express');
          expect(results).toEqual([
            shopsActions.shopRenamed({
              shop: { id: 's1' as ShopId, name: 'Tesco Express' } as Shop,
            }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('deleteShop$', () => {
    it('dispatches shopDeleted on successful delete', () => {
      shopApi.deleteShop.mockResolvedValue(undefined);

      const results: unknown[] = [];
      effects.deleteShop$.subscribe((action) => results.push(action));

      actions$.next(shopsApiActions.deleteShopRequested({ id: 's1' as ShopId }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shopApi.deleteShop).toHaveBeenCalledWith('s1');
          expect(results).toEqual([
            shopsActions.shopDeleted({ id: 's1' as ShopId }),
          ]);
          resolve();
        });
      });
    });
  });
});
