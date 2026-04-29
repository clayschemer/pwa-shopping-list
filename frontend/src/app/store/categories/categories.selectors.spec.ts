import { describe, it, expect } from 'vitest';
import {
  selectAllCategories,
  selectCategoryEntities,
  selectCategoriesLoaded,
} from './categories.selectors';
import { categoriesAdapter, CategoriesState } from './categories.reducer';
import type { Category } from '../../models/category.model';
import type { AccountId, CategoryId } from '../../models/ids.model';

const cat = (id: string, name: string, order: number): Category => ({
  id: id as CategoryId,
  accountId: 'a1' as AccountId,
  name,
  color: null,
  globalSortOrder: order,
});

function makeState(categories: Category[], loaded = true): CategoriesState {
  return categoriesAdapter.setAll(categories, {
    ...categoriesAdapter.getInitialState({ loaded }),
  });
}

describe('categories selectors', () => {
  it('selectAllCategories returns sorted array', () => {
    const state = makeState([cat('c2', 'Dairy', 1), cat('c1', 'Produce', 0)]);
    const result = selectAllCategories.projector(state);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('selectCategoryEntities returns dictionary', () => {
    const state = makeState([cat('c1', 'Produce', 0)]);
    const result = selectCategoryEntities.projector(state);
    expect(result['c1']!.name).toBe('Produce');
  });

  it('selectCategoriesLoaded returns loaded flag', () => {
    const state = makeState([], false);
    expect(selectCategoriesLoaded.projector(state)).toBe(false);

    const loadedState = makeState([], true);
    expect(selectCategoriesLoaded.projector(loadedState)).toBe(true);
  });
});
