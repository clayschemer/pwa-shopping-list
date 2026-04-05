import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { categoriesApiActions } from './categories.actions';
import type { Category } from '../../models/category.model';

export interface CategoriesState extends EntityState<Category> {
  loaded: boolean;
}

const adapter = createEntityAdapter<Category>();

export const initialCategoriesState: CategoriesState = adapter.getInitialState({
  loaded: false,
});

export const categoriesReducer = createReducer(
  initialCategoriesState,

  on(categoriesApiActions.fetchAllCategoriesSuccess, (state, { categories }) =>
    adapter.setAll(categories, { ...state, loaded: true }),
  ),

  on(categoriesApiActions.categoryStreamUpdated, (state, { changes }) => {
    let s = state;
    for (const change of changes) {
      if (change.changeType === 'removed') {
        s = adapter.removeOne(change.entity.id, s);
      } else {
        s = adapter.upsertOne(change.entity, s);
      }
    }
    return s;
  }),
);

export const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
