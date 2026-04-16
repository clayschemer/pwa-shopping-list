import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { sessionsActions } from './sessions.actions';
import type { Session } from '../../models/session.model';

export const sessionsAdapter = createEntityAdapter<Session>({
  sortComparer: (a, b) => b.startedAt - a.startedAt,
});

export interface SessionsState extends EntityState<Session> {
  loaded: boolean;
}

export const initialSessionsState: SessionsState = sessionsAdapter.getInitialState({
  loaded: false,
});

export const sessionsReducer = createReducer(
  initialSessionsState,

  on(sessionsActions.sessionsLoaded, (state, { sessions }) =>
    sessionsAdapter.setAll(sessions, { ...state, loaded: true }),
  ),

  on(sessionsActions.sessionStarted, (state, { session }) =>
    sessionsAdapter.upsertOne(session, state),
  ),

  on(sessionsActions.sessionJoined, (state, { session }) =>
    sessionsAdapter.upsertOne(session, state),
  ),

  on(sessionsActions.sessionUpdated, (state, { session }) =>
    sessionsAdapter.upsertOne(session, state),
  ),

  on(sessionsActions.sessionClosed, (state, { id }) =>
    sessionsAdapter.removeOne(id, state),
  ),

  on(sessionsActions.sessionChangesReceived, (state, { sessions, removed }) => {
    const afterRemove = sessionsAdapter.removeMany(removed, state);
    return sessionsAdapter.upsertMany(sessions, afterRemove);
  }),
);
