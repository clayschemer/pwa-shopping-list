import type { AccountId, CategoryGroupId, CategoryId } from './ids.model';

export interface Category {
  id: CategoryId;
  accountId: AccountId;
  name: string;
  color: string | null;
  globalSortOrder: number;
  /**
   * Groups this category belongs to. Many-to-many: a category relevant to
   * several kinds of shop (cleaning products, lightbulbs) sits in several
   * groups. Purely a bulk-action shortcut — group membership has no effect on
   * ordering or on how the category renders in plan or shop mode.
   */
  groupIds: CategoryGroupId[];
}
