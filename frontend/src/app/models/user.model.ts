import type { AccountId, UserId } from './ids.model';

export interface User {
  id: UserId;
  accountId: AccountId;
  email: string;
  displayName: string;
}
