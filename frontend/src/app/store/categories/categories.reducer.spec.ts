import { describe, it, expect } from 'vitest';
import { categoriesReducer, initialCategoriesState } from './categories.reducer';
import { categoriesActions } from './categories.actions';
import type { Category } from '../../models/category.model';
import type { AccountId, CategoryId } from '../../models/ids.model';

const cat = (id: string, name: string, order: number): Category => ({
  id: id as CategoryId,
  accountId: 'a1' as AccountId,
  name,
  globalSortOrder: order,
});

describe('categoriesReducer', () => {
  it('has empty initial state', () => {
    const state = categoriesReducer(undefined, { type: '@@INIT' } as never);
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
    expect(state.loaded).toBe(false);
  });

  it('populates entities on categoriesLoaded', () => {
    const categories = [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1)];
    const state = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({ categories }),
    );
    expect(state.ids).toEqual(['c1', 'c2']);
    expect(state.entities['c1']!.name).toBe('Produce');
    expect(state.entities['c2']!.name).toBe('Dairy');
    expect(state.loaded).toBe(true);
  });

  it('sorts by globalSortOrder on load', () => {
    const categories = [cat('c2', 'Dairy', 1), cat('c1', 'Produce', 0)];
    const state = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({ categories }),
    );
    expect(state.ids).toEqual(['c1', 'c2']);
  });

  it('inserts a new category on categoryAdded', () => {
    const loaded = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({ categories: [cat('c1', 'Produce', 0)] }),
    );
    const state = categoriesReducer(
      loaded,
      categoriesActions.categoryAdded({ category: cat('c2', 'Dairy', 1) }),
    );
    expect(state.ids).toContain('c2');
    expect(state.entities['c2']!.name).toBe('Dairy');
  });

  it('updates entity on categoryRenamed', () => {
    const loaded = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({ categories: [cat('c1', 'Produce', 0)] }),
    );
    const renamed = { ...cat('c1', 'Fresh Produce', 0) };
    const state = categoriesReducer(
      loaded,
      categoriesActions.categoryRenamed({ category: renamed }),
    );
    expect(state.entities['c1']!.name).toBe('Fresh Produce');
  });

  it('removes entity on categoryDeleted', () => {
    const loaded = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({
        categories: [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1)],
      }),
    );
    const state = categoriesReducer(
      loaded,
      categoriesActions.categoryDeleted({ id: 'c1' as CategoryId }),
    );
    expect(state.ids).toEqual(['c2']);
    expect(state.entities['c1']).toBeUndefined();
  });

  it('updates globalSortOrder on globalCategoryOrderSet', () => {
    const loaded = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({
        categories: [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1), cat('c3', 'Bakery', 2)],
      }),
    );
    const state = categoriesReducer(
      loaded,
      categoriesActions.globalCategoryOrderSet({
        orderedIds: ['c3' as CategoryId, 'c1' as CategoryId, 'c2' as CategoryId],
      }),
    );
    expect(state.entities['c3']!.globalSortOrder).toBe(0);
    expect(state.entities['c1']!.globalSortOrder).toBe(1);
    expect(state.entities['c2']!.globalSortOrder).toBe(2);
    // IDs should be re-sorted by new globalSortOrder
    expect(state.ids).toEqual(['c3', 'c1', 'c2']);
  });

  it('handles categoryChangesReceived with added and modified', () => {
    const loaded = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({ categories: [cat('c1', 'Produce', 0)] }),
    );
    const state = categoriesReducer(
      loaded,
      categoriesActions.categoryChangesReceived({
        categories: [cat('c1', 'Fresh Produce', 0), cat('c2', 'Dairy', 1)],
        removed: [],
      }),
    );
    expect(state.entities['c1']!.name).toBe('Fresh Produce');
    expect(state.entities['c2']!.name).toBe('Dairy');
  });

  it('handles categoryChangesReceived with removals', () => {
    const loaded = categoriesReducer(
      initialCategoriesState,
      categoriesActions.categoriesLoaded({
        categories: [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1)],
      }),
    );
    const state = categoriesReducer(
      loaded,
      categoriesActions.categoryChangesReceived({
        categories: [],
        removed: ['c1' as CategoryId],
      }),
    );
    expect(state.ids).toEqual(['c2']);
  });
});
