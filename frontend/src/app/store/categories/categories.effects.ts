import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, map, switchMap } from 'rxjs';
import { categoriesActions, categoriesApiActions } from './categories.actions';
import { accountActions } from '../account/account.actions';
import { CategoryApiService } from '../../core/api/category-api.service';
import type { Category } from '../../models/category.model';
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

  readonly addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoriesApiActions.addCategoryRequested),
      switchMap(({ name }) =>
        from(this.categoryApi.addCategory(name)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              // TODO: handle name conflict in UI
              return { type: '[Categories] Add Category Failed (noop)' };
            }
            return categoriesActions.categoryAdded({ category: result as Category });
          }),
        ),
      ),
    ),
  );
}
