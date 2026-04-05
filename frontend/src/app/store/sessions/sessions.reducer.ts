import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { sessionsApiActions } from './sessions.actions';
import type { Session } from '../../models/session.model';

export interface SessionsState extends EntityState<Session> {
  loaded: boolean;
  conflictError: boolean;
}

const adapter = createEntityAdapter<Session>();

export const initialSessionsState: SessionsState = adapter.getInitialState({
  loaded: false,
  conflictError: false,
});

export const sessionsReducer = createReducer(
  initialSessionsState,

  on(sessionsApiActions.fetchActiveSessionsSuccess, (state, { sessions }) =>
    adapter.setAll(sessions, { ...state, loaded: true, conflictError: false }),
  ),

  on(sessionsApiActions.sessionStreamUpdated, (state, { changes }) => {
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

  on(sessionsApiActions.startSessionConflict, (state) => ({
    ...state,
    conflictError: true,
  })),

  on(sessionsApiActions.startSessionSuccess, (state) => ({
    ...state,
    conflictError: false,
  })),
);

export const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
