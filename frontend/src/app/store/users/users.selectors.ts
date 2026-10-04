import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UsersState, usersAdapter } from './users.reducer';
import type { UserId } from '../../models/ids.model';

const selectUsersState = createFeatureSelector<UsersState>('users');

const { selectAll, selectEntities } = usersAdapter.getSelectors();

export const selectAllUsers = createSelector(selectUsersState, selectAll);
export const selectUserEntities = createSelector(
  selectUsersState,
  selectEntities,
);
export const selectUserById = (id: UserId) =>
  createSelector(selectUserEntities, (entities) => entities[id] ?? null);
