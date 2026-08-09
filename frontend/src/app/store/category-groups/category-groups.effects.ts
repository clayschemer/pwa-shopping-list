import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { categoryGroupsActions, categoryGroupsApiActions } from './category-groups.actions';
import { accountActions } from '../account/account.actions';
import { CategoryGroupApiService } from '../../core/api/category-group-api.service';
import type { CategoryGroup } from '../../models/category-group.model';
import type { CategoryGroupId } from '../../models/ids.model';
import type { NameConflictError } from '../../models/errors.model';

@Injectable()
export class CategoryGroupsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(CategoryGroupApiService);

  // Groups are a gate on `selectListDataLoaded`, so the initial fetch fails
  // OPEN — a rejected fetch that dispatched a failure action instead would
  // hang the list skeleton for the rest of the session.
  readonly fetchAllCategoryGroups$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.api.fetchAllCategoryGroups()).pipe(
          map((groups) => categoryGroupsActions.categoryGroupsLoaded({ groups })),
          catchError(() =>
            of(categoryGroupsActions.categoryGroupsLoaded({ groups: [] })),
          ),
        ),
      ),
    ),
  );

  readonly watchCategoryGroupChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.api.categoryGroupChanges$().pipe(
          map((batch) => {
            const groups: CategoryGroup[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: CategoryGroupId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return categoryGroupsActions.categoryGroupChangesReceived({ groups, removed });
          }),
        ),
      ),
    ),
  );

  // Every API-calling effect handles rejection INSIDE the flattening operator:
  // a rejected promise must dispatch a failure action, never error the outer
  // stream — an errored effect is resubscribed at most 10 times by NgRx and
  // then dies silently for the rest of the session.
  readonly addCategoryGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoryGroupsApiActions.addCategoryGroupRequested),
      switchMap(({ name }) =>
        from(this.api.addCategoryGroup(name)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Category Groups] Add Conflict (noop)' };
            }
            return categoryGroupsActions.categoryGroupAdded({
              group: result as CategoryGroup,
            });
          }),
          catchError(() =>
            of(categoryGroupsActions.categoryGroupSaveFailed({ id: null })),
          ),
        ),
      ),
    ),
  );

  readonly renameCategoryGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoryGroupsApiActions.renameCategoryGroupRequested),
      switchMap(({ id, name }) =>
        from(this.api.renameCategoryGroup(id, name)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return { type: '[Category Groups] Rename Conflict (noop)' };
            }
            return categoryGroupsActions.categoryGroupRenamed({
              group: result as CategoryGroup,
            });
          }),
          catchError(() => of(categoryGroupsActions.categoryGroupSaveFailed({ id }))),
        ),
      ),
    ),
  );

  readonly deleteCategoryGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(categoryGroupsApiActions.deleteCategoryGroupRequested),
      switchMap(({ id }) =>
        from(this.api.deleteCategoryGroup(id)).pipe(
          map(() => categoryGroupsActions.categoryGroupDeleted({ id })),
          catchError(() => of(categoryGroupsActions.categoryGroupSaveFailed({ id }))),
        ),
      ),
    ),
  );
}
