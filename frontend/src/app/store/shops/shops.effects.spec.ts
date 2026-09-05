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
  { id: 's1' as ShopId, accountId: 'a1' as AccountId, name: 'Tesco', categoryOrder: [], priceSearchUrl: null },
  { id: 's2' as ShopId, accountId: 'a1' as AccountId, name: 'Lidl', categoryOrder: [], priceSearchUrl: null },
];

const mockAccount = { id: 'a1' as AccountId, name: 'Test', shopOrder: [], aiConfig: null };

describe('ShopsEffects', () => {
  let effects: ShopsEffects;
  let actions$: Subject<unknown>;
  let shopApi: {
    fetchAllShops: ReturnType<typeof vi.fn>;
    addShop: ReturnType<typeof vi.fn>;
    renameShop: ReturnType<typeof vi.fn>;
    deleteShop: ReturnType<typeof vi.fn>;
    setShopCategoryOrder: ReturnType<typeof vi.fn>;
    setShopPriceUrl: ReturnType<typeof vi.fn>;
    setShopOrder: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    shopApi = {
      fetchAllShops: vi.fn(),
      addShop: vi.fn(),
      renameShop: vi.fn(),
      deleteShop: vi.fn(),
      setShopCategoryOrder: vi.fn(),
      setShopPriceUrl: vi.fn(),
      setShopOrder: vi.fn(),
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
        priceSearchUrl: null,
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

  describe('failure resilience', () => {
    const flush = () => new Promise<void>((r) => setTimeout(r));

    it('setShopCategoryOrder$ dispatches shopSaveFailed and survives a rejected call', async () => {
      shopApi.setShopCategoryOrder
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.setShopCategoryOrder$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = shopsApiActions.setShopCategoryOrderRequested({
        shopId: 's1' as ShopId,
        orderedIds: ['c2', 'c1'] as CategoryId[],
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        shopsActions.shopSaveFailed({ id: 's1' as ShopId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain(
        'Shop Category Order Set',
      );
    });

    it('addShop$ dispatches shopSaveFailed and survives a rejected call', async () => {
      shopApi.addShop
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(mockShops[0]);
      const results: unknown[] = [];
      let errored = false;
      effects.addShop$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = shopsApiActions.addShopRequested({ name: 'Aldi' });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([shopsActions.shopSaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Shop Added');
    });

    it('renameShop$ dispatches shopSaveFailed and survives a rejected call', async () => {
      shopApi.renameShop
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.renameShop$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = shopsApiActions.renameShopRequested({
        id: 's1' as ShopId,
        name: 'Tesco Express',
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        shopsActions.shopSaveFailed({ id: 's1' as ShopId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Shop Renamed');
    });

    it('deleteShop$ dispatches shopSaveFailed and survives a rejected call', async () => {
      shopApi.deleteShop
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.deleteShop$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = shopsApiActions.deleteShopRequested({ id: 's1' as ShopId });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        shopsActions.shopSaveFailed({ id: 's1' as ShopId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Shop Deleted');
    });

    it('setShopPriceUrl$ dispatches shopSaveFailed and survives a rejected call', async () => {
      shopApi.setShopPriceUrl
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.setShopPriceUrl$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = shopsApiActions.setShopPriceUrlRequested({
        id: 's1' as ShopId,
        url: 'https://example.test/?q={query}',
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        shopsActions.shopSaveFailed({ id: 's1' as ShopId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Shop Price Url Set');
    });

    it('setShopOrder$ dispatches shopSaveFailed and survives a rejected call', async () => {
      shopApi.setShopOrder
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.setShopOrder$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = shopsApiActions.setShopOrderRequested({
        orderedIds: ['s2', 's1'] as ShopId[],
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([shopsActions.shopSaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Shop Order Updated');
    });

    // The list skeleton is gated on every slice reporting loaded. A rejected
    // initial fetch must still mark the slice loaded (with no shops) or the
    // whole list hangs on a skeleton for the rest of the session.
    it('fetchAllShops$ fails open to an empty shopsLoaded', async () => {
      shopApi.fetchAllShops.mockRejectedValueOnce(new Error('client is offline'));
      const results: unknown[] = [];
      let errored = false;
      effects.fetchAllShops$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });

      actions$.next(
        accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }),
      );
      await flush();

      expect(errored).toBe(false);
      expect(results).toEqual([shopsActions.shopsLoaded({ shops: [] })]);
    });
  });
});
