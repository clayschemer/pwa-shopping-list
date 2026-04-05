import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Account } from '../../models/account.model';
import type { User } from '../../models/user.model';

export const authActions = createActionGroup({
  source: 'Auth',
  events: {
    'Auth State Resolved': props<{ user: User }>(),
    'Auth State Empty': emptyProps(),
    'Sign In Requested': emptyProps(),
    'Sign In Failed': emptyProps(),
    'Sign Out Requested': emptyProps(),
    'Signed Out': emptyProps(),
  },
});

export const accountActions = createActionGroup({
  source: 'Account',
  events: {
    'Account Loaded': props<{ account: Account }>(),
    'Access Denied': emptyProps(),
  },
});
