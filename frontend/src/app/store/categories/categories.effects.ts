import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
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

  // The initial fetch fails OPEN: `selectListDataLoaded` gates the whole list
  // on every slice reporting loaded, so a rejected fetch that dispatched a
  // failure action instead would hang the list on a skeleton for the rest of
  // the session.
  readonly fetchAllCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.categoryApi.fetchAllCategories()).pipe(
          map((categories) => categoriesActions.categoriesLoaded({ categories })),
          catchError(() =>
            of(categoriesActions.categoriesLoaded({ categories: [] })),
          ),
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

  // Every API-calling effect handles rejection INSIDE the flattening operator:
  // a rejected promise (offline / flaky in-store connectivity) must dispatch a
  // failure action, never error the outer stream — an errored effect is
  // resubscribed at most 10 times by NgRx and then dies silently for the rest
  // of the session.
  readonly addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.addCategoryRequested),
      switchMap(({ name, color }) =>
        from(this.categoryApi.addCategory(name, color)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Categories] Add Category Conflict (noop)' };
            }
            return categoriesActions.categoryAdded({ category: result as Category });
          }),
          catchError(() => of(categoriesActions.categorySaveFailed({ id: null }))),
        ),
      ),
    ),
  );

  readonly renameCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.renameCategoryRequested),
      switchMap(({ id, name, color }) =>
        from(this.categoryApi.renameCategory(id, name, color)).pipe(
          map((result) => {
            if (result && (result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Categories] Rename Category Conflict (noop)' };
            }
            return categoriesActions.categoryRenamed({
              category: { id, name } as Category,
            });
          }),
          catchError(() => of(categoriesActions.categorySaveFailed({ id }))),
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
          catchError(() => of(categoriesActions.categorySaveFailed({ id }))),
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
          catchError(() => of(categoriesActions.categorySaveFailed({ id: null }))),
        ),
      ),
    ),
  );

  // Bulk group assignment is one API call for the whole selection, not one per
  // category — a single writeBatch of arrayUnion/arrayRemove.
  readonly addCategoriesToGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.addCategoriesToGroupRequested),
      switchMap(({ ids, groupId }) =>
        from(this.categoryApi.addCategoriesToGroup(ids, groupId)).pipe(
          map(() => categoriesActions.categoriesAddedToGroup({ ids, groupId })),
          catchError(() => of(categoriesActions.categorySaveFailed({ id: null }))),
        ),
      ),
    ),
  );

  readonly removeCategoriesFromGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.removeCategoriesFromGroupRequested),
      switchMap(({ ids, groupId }) =>
        from(this.categoryApi.removeCategoriesFromGroup(ids, groupId)).pipe(
          map(() => categoriesActions.categoriesRemovedFromGroup({ ids, groupId })),
          catchError(() => of(categoriesActions.categorySaveFailed({ id: null }))),
        ),
      ),
    ),
  );
}
