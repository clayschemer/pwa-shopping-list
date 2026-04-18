import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';

export const authActions = createActionGroup({
  source: 'Auth',
  events: {
    'Auth State Resolved': props<{ user: User }>(),
    'Auth State Empty': emptyProps(),
    'Sign In With Google Requested': emptyProps(),
    'Sign In With Email Requested': props<{ email: string; password: string }>(),
    'Sign In Failed': props<{ code: string }>(),
    'Sign Out Requested': emptyProps(),
    'Signed Out': emptyProps(),
  },
});

export const accountActions = createActionGroup({
  source: 'Account',
  events: {
    'Account Loaded': props<{ account: Account }>(),
    'Access Denied': emptyProps(),
    'Pending Verification': emptyProps(),
    'Stream Auth Revoked': emptyProps(),
    'Stream Account Not Found': emptyProps(),
    'Stream Failed': props<{ message: string }>(),
  },
});
