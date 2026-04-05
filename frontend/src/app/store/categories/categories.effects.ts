import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { defer, from, map, switchMap } from 'rxjs';
import { categoriesActions, categoriesApiActions } from './categories.actions';
import { CategoryApiService } from '../../core/api/category-api.service';
import { ChangeStreamService } from '../../core/stream/change-stream.service';

@Injectable()
export class CategoriesEffects {
  private readonly actions$ = inject(Actions);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly streams = inject(ChangeStreamService);

  readonly loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType('@ngrx/effects/init' as never),
      switchMap(() =>
        from(this.categoryApi.fetchAllCategories()).pipe(
          map((categories) =>
            categoriesApiActions.fetchAllCategoriesSuccess({ categories }),
          ),
        ),
      ),
    ),
  );

  readonly categoryStream$ = createEffect(() =>
    defer(() => this.streams.categoryChanges$).pipe(
      map((changes) => categoriesApiActions.categoryStreamUpdated({ changes })),
    ),
  );

  readonly addCategory$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(categoriesActions.addCategoryRequested),
        switchMap(({ name }) => from(this.categoryApi.addCategory(name))),
      ),
    { dispatch: false },
  );

  readonly renameCategory$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(categoriesActions.renameCategoryRequested),
        switchMap(({ id, name }) => from(this.categoryApi.renameCategory(id, name))),
      ),
    { dispatch: false },
  );

  readonly deleteCategory$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(categoriesActions.deleteCategoryRequested),
        switchMap(({ id }) => from(this.categoryApi.deleteCategory(id))),
      ),
    { dispatch: false },
  );

  readonly setGlobalOrder$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(categoriesActions.setGlobalOrderRequested),
        switchMap(({ orderedIds }) =>
          from(this.categoryApi.setGlobalCategoryOrder(orderedIds)),
        ),
      ),
    { dispatch: false },
  );
}
