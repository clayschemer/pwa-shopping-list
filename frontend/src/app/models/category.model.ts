import type { AccountId, CategoryId } from './ids.model';

export interface Category {
  id: CategoryId;
  accountId: AccountId;
  name: string;
  globalSortOrder: number;
}
