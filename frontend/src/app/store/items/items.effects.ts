import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { defer, from, map, switchMap } from 'rxjs';
import { itemsApiActions } from './items.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { ChangeStreamService } from '../../core/stream/change-stream.service';

@Injectable()
export class ItemsEffects {
  private readonly actions$ = inject(Actions);
  private readonly itemApi = inject(ItemApiService);
  private readonly streams = inject(ChangeStreamService);

  readonly loadItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType('@ngrx/effects/init' as never),
      switchMap(() =>
        from(this.itemApi.fetchActiveList()).pipe(
          map((items) => itemsApiActions.fetchActiveListSuccess({ items })),
        ),
      ),
    ),
  );

  readonly itemStream$ = createEffect(() =>
    defer(() => this.streams.itemChanges$).pipe(
      map((changes) => itemsApiActions.itemStreamUpdated({ changes })),
    ),
  );
}
