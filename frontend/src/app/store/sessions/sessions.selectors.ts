import { createFeatureSelector, createSelector } from '@ngrx/store';
import { sessionsAdapter, SessionsState } from './sessions.reducer';
import { selectSelectedShopId } from '../ui/ui.selectors';
import type { ShopId } from '../../models/ids.model';

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

export const selectActiveSessionForCurrentShop = createSelector(
  selectActiveSessions,
  selectSelectedShopId,
  (sessions, shopId) =>
    sessions.find((s) => s.shopId === shopId) ?? null,
);

export const selectShopsWithActiveSessions = createSelector(
  selectActiveSessions,
  (sessions) => new Set<ShopId | null>(sessions.map((s) => s.shopId)),
);

export const selectSessionsLoaded = createSelector(
  selectSessionsState,
  (s) => s.loaded,
);
