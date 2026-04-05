import { createFeatureSelector, createSelector } from '@ngrx/store';
import { selectAll, selectEntities } from './sessions.reducer';
import type { SessionsState } from './sessions.reducer';
import type { SessionId, UserId } from '../../models/ids.model';

export const selectSessionsState =
  createFeatureSelector<SessionsState>('sessions');

export const selectAllSessions = createSelector(
  selectSessionsState,
  (state) => selectAll(state),
);

export const selectSessionsLoaded = createSelector(
  selectSessionsState,
  (state) => state.loaded,
);

export const selectSessionById = (id: SessionId) =>
  createSelector(selectSessionsState, (state) => selectEntities(state)[id]);

export const selectMyActiveSession = (userId: UserId) =>
  createSelector(selectAllSessions, (sessions) =>
    sessions.find(
      (s) => s.completedAt === null && s.participants.includes(userId),
    ) ?? null,
  );

export const selectSessionConflictError = createSelector(
  selectSessionsState,
  (state) => state.conflictError,
);
