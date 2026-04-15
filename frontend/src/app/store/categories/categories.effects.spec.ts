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
    setShopCategoryOrder: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    categoryApi = {
      fetchAllCategories: vi.fn(),
      addCategory: vi.fn(),
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
});
