import { createFeatureSelector, createSelector } from '@ngrx/store';
import { sessionsAdapter, SessionsState } from './sessions.reducer';
import { selectCurrentUser } from '../account/account.selectors';

export const selectSessionsState = createFeatureSelector<SessionsState>('sessions');

const { selectAll, selectEntities } = sessionsAdapter.getSelectors();

export const selectAllSessions = createSelector(selectSessionsState, selectAll);

export const selectSessionEntities = createSelector(
  selectSessionsState,
  selectEntities,
);

export const selectActiveSessions = createSelector(selectAllSessions, (sessions) =>
  sessions.filter((s) => s.completedAt === null),
);

export const selectActiveSessionForCurrentUser = createSelector(
  selectActiveSessions,
  selectCurrentUser,
  (sessions, user) => {
    if (!user) return null;
    return (
      sessions.find((s) => s.participants.includes(user.id)) ?? null
    );
  },
);

export const selectSessionsLoaded = createSelector(
  selectSessionsState,
  (s) => s.loaded,
);
