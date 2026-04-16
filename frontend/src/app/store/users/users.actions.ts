import { createActionGroup, props } from '@ngrx/store';
import type { User } from '../../models/user.model';
import type { UserId } from '../../models/ids.model';

export const usersActions = createActionGroup({
  source: 'Users',
  events: {
    'Users Loaded': props<{ users: User[] }>(),
    'User Changes Received': props<{ users: User[]; removed: UserId[] }>(),
  },
});
