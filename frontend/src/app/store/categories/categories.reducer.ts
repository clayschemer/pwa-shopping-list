import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { categoriesActions } from './categories.actions';
import type { Category } from '../../models/category.model';

export const categoriesAdapter = createEntityAdapter<Category>({
  sortComparer: (a, b) => a.globalSortOrder - b.globalSortOrder,
});

export interface CategoriesState extends EntityState<Category> {
  loaded: boolean;
}

export const initialCategoriesState: CategoriesState = categoriesAdapter.getInitialState({
  loaded: false,
});

export const categoriesReducer = createReducer(
  initialCategoriesState,

  on(categoriesActions.categoriesLoaded, (state, { categories }) =>
    categoriesAdapter.setAll(categories, { ...state, loaded: true }),
  ),

  on(categoriesActions.categoryAdded, (state, { category }) =>
    categoriesAdapter.addOne(category, state),
  ),

  on(categoriesActions.categoryRenamed, (state, { category }) =>
    categoriesAdapter.upsertOne(category, state),
  ),

  on(categoriesActions.categoryDeleted, (state, { id }) =>
    categoriesAdapter.removeOne(id, state),
  ),

  on(categoriesActions.globalCategoryOrderSet, (state, { orderedIds }) => {
    const updates = orderedIds
      .map((id, index) => ({ id, changes: { globalSortOrder: index } }))
      .filter((u) => !!state.entities[u.id]);
    return categoriesAdapter.updateMany(updates, state);
  }),

  on(categoriesActions.categoryChangesReceived, (state, { categories, removed }) => {
    const afterRemove = categoriesAdapter.removeMany(removed, state);
    return categoriesAdapter.upsertMany(categories, afterRemove);
  }),
);
