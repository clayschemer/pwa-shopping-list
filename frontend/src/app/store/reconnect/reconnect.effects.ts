import { inject, Injectable, NgZone } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable, switchMap, from, map, merge } from 'rxjs';
import { accountActions } from '../account/account.actions';
import { itemsActions } from '../items/items.actions';
import { sessionsActions } from '../sessions/sessions.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { SessionApiService } from '../../core/api/session-api.service';

const MIN_HIDDEN_MS = 30_000;

@Injectable()
export class ReconnectEffects {
  private readonly actions$ = inject(Actions);
  private readonly zone = inject(NgZone);
  private readonly itemApi = inject(ItemApiService);
  private readonly sessionApi = inject(SessionApiService);

  private hiddenAt: number | null = null;

  readonly reconnectOnWake$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() => this.createWakeObservable()),
      switchMap(() =>
        merge(
          from(this.itemApi.fetchActiveList()).pipe(
            map((items) => itemsActions.itemsLoaded({ items })),
          ),
          from(this.sessionApi.fetchActiveSessions()).pipe(
            map((sessions) => sessionsActions.sessionsLoaded({ sessions })),
          ),
        ),
      ),
    ),
  );

  private createWakeObservable(): Observable<void> {
    return new Observable<void>((subscriber) => {
      const handler = (): void => {
        if (document.visibilityState === 'hidden') {
          this.hiddenAt = Date.now();
        } else if (document.visibilityState === 'visible') {
          const elapsed = this.hiddenAt ? Date.now() - this.hiddenAt : 0;
          this.hiddenAt = null;
          if (elapsed >= MIN_HIDDEN_MS) {
            this.zone.run(() => subscriber.next());
          }
        }
      };
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    });
  }
}
