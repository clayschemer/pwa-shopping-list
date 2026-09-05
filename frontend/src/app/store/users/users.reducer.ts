import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { usersActions } from './users.actions';
import type { User } from '../../models/user.model';

export const usersAdapter = createEntityAdapter<User>();

export interface UsersState extends EntityState<User> {
  loaded: boolean;
}

export const initialUsersState: UsersState = usersAdapter.getInitialState({
  loaded: false,
});

export const usersReducer = createReducer(
  initialUsersState,

  on(usersActions.usersLoaded, (state, { users }) =>
    usersAdapter.setAll(users, { ...state, loaded: true }),
  ),

  on(usersActions.userChangesReceived, (state, { users, removed }) => {
    const afterRemove = usersAdapter.removeMany(removed, state);
    return usersAdapter.upsertMany(users, afterRemove);
  }),
);
