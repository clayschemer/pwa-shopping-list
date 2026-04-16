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
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const mockCategories: Category[] = [
  { id: 'c1' as CategoryId, accountId: 'a1' as AccountId, name: 'Produce', globalSortOrder: 0 },
  { id: 'c2' as CategoryId, accountId: 'a1' as AccountId, name: 'Dairy', globalSortOrder: 1 },
];

const mockAccount = { id: 'a1' as AccountId, name: 'Test', aiConfig: null };

describe('CategoriesEffects', () => {
  let effects: CategoriesEffects;
  let actions$: Subject<unknown>;
  let categoryApi: {
    fetchAllCategories: ReturnType<typeof vi.fn>;
    addCategory: ReturnType<typeof vi.fn>;
    renameCategory: ReturnType<typeof vi.fn>;
    deleteCategory: ReturnType<typeof vi.fn>;
    setGlobalCategoryOrder: ReturnType<typeof vi.fn>;
    setShopCategoryOrder: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    categoryApi = {
      fetchAllCategories: vi.fn(),
      addCategory: vi.fn(),
      renameCategory: vi.fn(),
      deleteCategory: vi.fn(),
      setGlobalCategoryOrder: vi.fn(),
      setShopCategoryOrder: vi.fn(),
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

      actions$.next(accountActions.accountLoaded({ account: mockAccount }));

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
        globalSortOrder: 2,
      };
      categoryApi.addCategory.mockResolvedValue(newCat);

      const results: unknown[] = [];
      effects.addCategory$.subscribe((action) => results.push(action));

      actions$.next(categoriesApiActions.addCategoryRequested({ name: 'Bakery' }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.addCategory).toHaveBeenCalledWith('Bakery');
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
        }),
      );

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(categoryApi.renameCategory).toHaveBeenCalledWith(
            'c1',
            'Fresh Produce',
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
});
