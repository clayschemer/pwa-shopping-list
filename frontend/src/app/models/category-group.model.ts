import type { AccountId, CategoryGroupId } from './ids.model';

/**
 * A named set of categories — "Grocery", "Furniture" — used to make many
 * categories available or unavailable at a shop in one action.
 *
 * Groups are imperative bulk shortcuts, not declarative rules: they carry no
 * ordering, appear nowhere in plan or shop mode, and affect nothing beyond
 * which category ids sit in a shop's `categoryOrder` at the moment the action
 * runs. Membership lives on the category (`Category.groupIds`); the group doc
 * exists so a group can be renamed atomically, can be empty, and can be
 * enumerated without scanning every category.
 */
export interface CategoryGroup {
  id: CategoryGroupId;
  accountId: AccountId;
  /** Unique within the account. */
  name: string;
}
