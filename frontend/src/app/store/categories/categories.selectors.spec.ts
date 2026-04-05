import { describe, it, expect } from 'vitest';
import { createSelector } from '@ngrx/store';
import {
  selectAllCategories,
  selectCategoryEntities,
  selectCategoriesLoaded,
  selectCategoryById,
  selectCategoriesOrderedGlobally,
} from './categories.selectors';
import type { CategoriesState } from './categories.reducer';
import type { Category } from '../../models/category.model';
import type { CategoryId, AccountId } from '../../models/ids.model';

const cat = (id: string, name: string, order: number): Category => ({
  id: id as CategoryId,
  accountId: 'acc-1' as AccountId,
  name,
  globalSortOrder: order,
});

const state: CategoriesState = {
  ids: ['c2', 'c1', 'c3'],
  entities: {
    c1: cat('c1', 'Produce', 1),
    c2: cat('c2', 'Dairy', 0),
    c3: cat('c3', 'Bakery', 2),
  },
  loaded: true,
};

describe('categories selectors', () => {
  it('selectAllCategories returns all categories', () => {
    const result = selectAllCategories.projector(state);
    expect(result).toHaveLength(3);
  });

  it('selectCategoriesLoaded reflects loaded flag', () => {
    expect(selectCategoriesLoaded.projector(state)).toBe(true);
  });

  it('selectCategoryById returns the matching category', () => {
    const selector = selectCategoryById('c2' as CategoryId);
    const result = selector.projector(state);
    expect(result?.name).toBe('Dairy');
  });

  it('selectCategoryById returns undefined for unknown id', () => {
    const selector = selectCategoryById('unknown' as CategoryId);
    expect(selector.projector(state)).toBeUndefined();
  });

  it('selectCategoriesOrderedGlobally returns categories sorted by globalSortOrder', () => {
    const result = selectCategoriesOrderedGlobally.projector(state);
    expect(result.map((c) => c.id)).toEqual(['c2', 'c1', 'c3']);
  });
});
