import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { CategoriesEffects } from './categories.effects';
import { categoriesActions, categoriesApiActions } from './categories.actions';
import { accountActions } from '../account/account.actions';
import { CategoryApiService } from '../../core/api/category-api.service';
import type { Category } from '../../models/category.model';
import type { AccountId, CategoryGroupId, CategoryId } from '../../models/ids.model';

const mockCategories: Category[] = [
  { id: 'c1' as CategoryId, accountId: 'a1' as AccountId, name: 'Produce', color: null, globalSortOrder: 0, groupIds: [] },
  { id: 'c2' as CategoryId, accountId: 'a1' as AccountId, name: 'Dairy', color: null, globalSortOrder: 1, groupIds: [] },
];

const mockAccount = { id: 'a1' as AccountId, name: 'Test', shopOrder: [], aiConfig: null };

describe('CategoriesEffects', () => {
  let effects: CategoriesEffects;
  let actions$: Subject<unknown>;
  let categoryApi: {
    fetchAllCategories: ReturnType<typeof vi.fn>;
    addCategory: ReturnType<typeof vi.fn>;
    renameCategory: ReturnType<typeof vi.fn>;
    deleteCategory: ReturnType<typeof vi.fn>;
    setGlobalCategoryOrder: ReturnType<typeof vi.fn>;
    addCategoriesToGroup: ReturnType<typeof vi.fn>;
    removeCategoriesFromGroup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    categoryApi = {
      fetchAllCategories: vi.fn(),
      addCategory: vi.fn(),
      renameCategory: vi.fn(),
      deleteCategory: vi.fn(),
      setGlobalCategoryOrder: vi.fn(),
      addCategoriesToGroup: vi.fn(),
      removeCategoriesFromGroup: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CategoriesEffects,
        provideMockActions(() => actions$),
        { provide: CategoryApiService, useValue: categoryApi },
      ],
    });

    effects = TestBed.inject(CategoriesEffects);
  });

  describe('fetchAllCategories$', () => {
    it('dispatches categoriesLoaded on accountLoaded', () => {
      categoryApi.fetchAllCategories.mockResolvedValue(mockCategories);

      const results: unknown[] = [];
      effects.fetchAllCategories$.subscribe((action) => results.push(action));

      actions$.next(accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.fetchAllCategories).toHaveBeenCalled();
          expect(results).toEqual([
            categoriesActions.categoriesLoaded({ categories: mockCategories }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('addCategory$', () => {
    it('dispatches categoryAdded on successful add', () => {
      const newCat: Category = {
        id: 'c3' as CategoryId,
        accountId: 'a1' as AccountId,
        name: 'Bakery',
        color: null,
        globalSortOrder: 2,
        groupIds: [],
      };
      categoryApi.addCategory.mockResolvedValue(newCat);

      const results: unknown[] = [];
      effects.addCategory$.subscribe((action) => results.push(action));

      actions$.next(categoriesApiActions.addCategoryRequested({ name: 'Bakery', color: null }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.addCategory).toHaveBeenCalledWith('Bakery', null);
          expect(results).toEqual([
            categoriesActions.categoryAdded({ category: newCat }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('renameCategory$', () => {
    it('dispatches categoryRenamed on successful rename', () => {
      categoryApi.renameCategory.mockResolvedValue(undefined);

      const results: unknown[] = [];
      effects.renameCategory$.subscribe((action) => results.push(action));

      actions$.next(
        categoriesApiActions.renameCategoryRequested({
          id: 'c1' as CategoryId,
          name: 'Fresh Produce',
          color: null,
        }),
      );

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.renameCategory).toHaveBeenCalledWith(
            'c1',
            'Fresh Produce',
            null,
          );
          expect(results).toHaveLength(1);
          const action = results[0] as ReturnType<
            typeof categoriesActions.categoryRenamed
          >;
          expect(action.type).toBe(categoriesActions.categoryRenamed.type);
          expect(action.category.id).toBe('c1');
          expect(action.category.name).toBe('Fresh Produce');
          resolve();
        });
      });
    });
  });

  describe('deleteCategory$', () => {
    it('dispatches categoryDeleted on successful delete', () => {
      categoryApi.deleteCategory.mockResolvedValue(undefined);

      const results: unknown[] = [];
      effects.deleteCategory$.subscribe((action) => results.push(action));

      actions$.next(
        categoriesApiActions.deleteCategoryRequested({ id: 'c1' as CategoryId }),
      );

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.deleteCategory).toHaveBeenCalledWith('c1');
          expect(results).toEqual([
            categoriesActions.categoryDeleted({ id: 'c1' as CategoryId }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('setGlobalCategoryOrder$', () => {
    it('dispatches globalCategoryOrderSet on successful update', () => {
      categoryApi.setGlobalCategoryOrder.mockResolvedValue(undefined);
      const orderedIds = ['c2', 'c1'] as CategoryId[];

      const results: unknown[] = [];
      effects.setGlobalCategoryOrder$.subscribe((action) =>
        results.push(action),
      );

      actions$.next(
        categoriesApiActions.setGlobalCategoryOrderRequested({ orderedIds }),
      );

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.setGlobalCategoryOrder).toHaveBeenCalledWith(
            orderedIds,
          );
          expect(results).toEqual([
            categoriesActions.globalCategoryOrderSet({ orderedIds }),
          ]);
          resolve();
        });
      });
    });
  });

  describe('group membership', () => {
    const flush = () => new Promise<void>((r) => setTimeout(r));

    it('adds every selected category to the group in a single API call', async () => {
      categoryApi.addCategoriesToGroup.mockResolvedValue(undefined);
      const ids = ['c1', 'c2'] as CategoryId[];
      const groupId = 'g1' as CategoryGroupId;
      const results: unknown[] = [];
      effects.addCategoriesToGroup$.subscribe((a) => results.push(a));

      actions$.next(
        categoriesApiActions.addCategoriesToGroupRequested({ ids, groupId }),
      );
      await flush();

      expect(categoryApi.addCategoriesToGroup).toHaveBeenCalledTimes(1);
      expect(categoryApi.addCategoriesToGroup).toHaveBeenCalledWith(ids, groupId);
      expect(results).toEqual([
        categoriesActions.categoriesAddedToGroup({ ids, groupId }),
      ]);
    });

    it('removes every selected category from the group in a single API call', async () => {
      categoryApi.removeCategoriesFromGroup.mockResolvedValue(undefined);
      const ids = ['c1', 'c2'] as CategoryId[];
      const groupId = 'g1' as CategoryGroupId;
      const results: unknown[] = [];
      effects.removeCategoriesFromGroup$.subscribe((a) => results.push(a));

      actions$.next(
        categoriesApiActions.removeCategoriesFromGroupRequested({ ids, groupId }),
      );
      await flush();

      expect(categoryApi.removeCategoriesFromGroup).toHaveBeenCalledTimes(1);
      expect(results).toEqual([
        categoriesActions.categoriesRemovedFromGroup({ ids, groupId }),
      ]);
    });

    it('addCategoriesToGroup$ dispatches categorySaveFailed and survives a rejected call', async () => {
      categoryApi.addCategoriesToGroup
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const ids = ['c1'] as CategoryId[];
      const groupId = 'g1' as CategoryGroupId;
      const results: unknown[] = [];
      let errored = false;
      effects.addCategoriesToGroup$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoriesApiActions.addCategoriesToGroupRequested({ ids, groupId });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([categoriesActions.categorySaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain(
        'Categories Added To Group',
      );
    });

    it('removeCategoriesFromGroup$ dispatches categorySaveFailed and survives a rejected call', async () => {
      categoryApi.removeCategoriesFromGroup
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const ids = ['c1'] as CategoryId[];
      const groupId = 'g1' as CategoryGroupId;
      const results: unknown[] = [];
      let errored = false;
      effects.removeCategoriesFromGroup$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoriesApiActions.removeCategoriesFromGroupRequested({
        ids,
        groupId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([categoriesActions.categorySaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain(
        'Categories Removed From Group',
      );
    });
  });

  describe('failure resilience', () => {
    const flush = () => new Promise<void>((r) => setTimeout(r));

    it('addCategory$ dispatches categorySaveFailed and survives a rejected call', async () => {
      categoryApi.addCategory
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(mockCategories[0]);
      const results: unknown[] = [];
      let errored = false;
      effects.addCategory$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoriesApiActions.addCategoryRequested({
        name: 'Bakery',
        color: null,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([categoriesActions.categorySaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Category Added');
    });

    it('renameCategory$ dispatches categorySaveFailed and survives a rejected call', async () => {
      categoryApi.renameCategory
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.renameCategory$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoriesApiActions.renameCategoryRequested({
        id: 'c1' as CategoryId,
        name: 'Fresh Produce',
        color: null,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        categoriesActions.categorySaveFailed({ id: 'c1' as CategoryId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Category Renamed');
    });

    it('deleteCategory$ dispatches categorySaveFailed and survives a rejected call', async () => {
      categoryApi.deleteCategory
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.deleteCategory$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoriesApiActions.deleteCategoryRequested({
        id: 'c1' as CategoryId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        categoriesActions.categorySaveFailed({ id: 'c1' as CategoryId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Category Deleted');
    });

    it('setGlobalCategoryOrder$ dispatches categorySaveFailed and survives a rejected call', async () => {
      categoryApi.setGlobalCategoryOrder
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.setGlobalCategoryOrder$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoriesApiActions.setGlobalCategoryOrderRequested({
        orderedIds: ['c2', 'c1'] as CategoryId[],
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([categoriesActions.categorySaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain(
        'Global Category Order Set',
      );
    });

    // The list skeleton is gated on every slice reporting loaded. A rejected
    // initial fetch must still mark the slice loaded (with no categories) or
    // the whole list hangs on a skeleton for the rest of the session.
    it('fetchAllCategories$ fails open to an empty categoriesLoaded', async () => {
      categoryApi.fetchAllCategories.mockRejectedValueOnce(
        new Error('client is offline'),
      );
      const results: unknown[] = [];
      let errored = false;
      effects.fetchAllCategories$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });

      actions$.next(
        accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }),
      );
      await flush();

      expect(errored).toBe(false);
      expect(results).toEqual([
        categoriesActions.categoriesLoaded({ categories: [] }),
      ]);
    });
  });
});
