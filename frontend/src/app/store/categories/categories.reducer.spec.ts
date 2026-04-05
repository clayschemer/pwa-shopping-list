import { describe, it, expect } from 'vitest';
import { categoriesReducer, initialCategoriesState } from './categories.reducer';
import { categoriesActions, categoriesApiActions } from './categories.actions';
import type { Category } from '../../models/category.model';
import type { CategoryId, AccountId } from '../../models/ids.model';

const cat = (id: string, name: string, order: number): Category => ({
  id: id as CategoryId,
  accountId: 'acc-1' as AccountId,
  name,
  globalSortOrder: order,
});

describe('categoriesReducer', () => {
  it('starts with empty categories and idle status', () => {
    const state = categoriesReducer(undefined, { type: '@@INIT' });
    expect(state.ids).toHaveLength(0);
    expect(state.loaded).toBe(false);
  });

  it('seeds categories from fetchAllCategories success', () => {
    const categories = [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1)];
    const state = categoriesReducer(
      initialCategoriesState,
      categoriesApiActions.fetchAllCategoriesSuccess({ categories }),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['c1']?.name).toBe('Produce');
    expect(state.loaded).toBe(true);
  });

  it('upserts a category on stream added', () => {
    const state = categoriesReducer(
      initialCategoriesState,
      categoriesApiActions.categoryStreamUpdated({
        changes: [{ entity: cat('c1', 'Produce', 0), changeType: 'added' }],
      }),
    );
    expect(state.entities['c1']?.name).toBe('Produce');
  });

  it('updates a category on stream modified', () => {
    let state = categoriesReducer(
      initialCategoriesState,
      categoriesApiActions.fetchAllCategoriesSuccess({ categories: [cat('c1', 'Produce', 0)] }),
    );
    state = categoriesReducer(
      state,
      categoriesApiActions.categoryStreamUpdated({
        changes: [{ entity: cat('c1', 'Greens', 0), changeType: 'modified' }],
      }),
    );
    expect(state.entities['c1']?.name).toBe('Greens');
  });

  it('removes a category on stream removed', () => {
    let state = categoriesReducer(
      initialCategoriesState,
      categoriesApiActions.fetchAllCategoriesSuccess({ categories: [cat('c1', 'Produce', 0)] }),
    );
    state = categoriesReducer(
      state,
      categoriesApiActions.categoryStreamUpdated({
        changes: [{ entity: cat('c1', 'Produce', 0), changeType: 'removed' }],
      }),
    );
    expect(state.ids).toHaveLength(0);
  });
});
