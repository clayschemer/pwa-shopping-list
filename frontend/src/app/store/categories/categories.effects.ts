import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, map, switchMap } from 'rxjs';
import { categoriesActions, categoriesApiActions } from './categories.actions';
import { accountActions } from '../account/account.actions';
import { CategoryApiService } from '../../core/api/category-api.service';
import type { Category } from '../../models/category.model';
import type { CategoryId } from '../../models/ids.model';
import type { NameConflictError } from '../../models/errors.model';

@Injectable()
export class CategoriesEffects {
  private readonly actions$ = inject(Actions);
  private readonly categoryApi = inject(CategoryApiService);

  readonly fetchAllCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.categoryApi.fetchAllCategories()).pipe(
          map((categories) => categoriesActions.categoriesLoaded({ categories })),
        ),
      ),
    ),
  );

  readonly watchCategoryChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.categoryApi.categoryChanges$().pipe(
          map((batch) => {
            const categories: Category[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: CategoryId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return categoriesActions.categoryChangesReceived({ categories, removed });
          }),
        ),
      ),
    ),
  );

  readonly addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.addCategoryRequested),
      switchMap(({ name }) =>
        from(this.categoryApi.addCategory(name)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Categories] Add Category Conflict (noop)' };
            }
            return categoriesActions.categoryAdded({ category: result as Category });
          }),
        ),
      ),
    ),
  );

  readonly renameCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.renameCategoryRequested),
      switchMap(({ id, name }) =>
        from(this.categoryApi.renameCategory(id, name)).pipe(
          map((result) => {
            if (result && (result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Categories] Rename Category Conflict (noop)' };
            }
            return categoriesActions.categoryRenamed({
              category: { id, name } as Category,
            });
          }),
        ),
      ),
    ),
  );

  readonly deleteCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.deleteCategoryRequested),
      switchMap(({ id }) =>
        from(this.categoryApi.deleteCategory(id)).pipe(
          map(() => categoriesActions.categoryDeleted({ id })),
        ),
      ),
    ),
  );

  readonly setGlobalCategoryOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.setGlobalCategoryOrderRequested),
      switchMap(({ orderedIds }) =>
        from(this.categoryApi.setGlobalCategoryOrder(orderedIds)).pipe(
          map(() => categoriesActions.globalCategoryOrderSet({ orderedIds })),
        ),
      ),
    ),
  );
}
