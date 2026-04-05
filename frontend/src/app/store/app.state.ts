import type { AccountState } from './account/account.reducer';
import type { CategoriesState } from './categories/categories.reducer';
import type { ShopsState } from './shops/shops.reducer';
import type { ItemsState } from './items/items.reducer';

export interface AppState {
  account: AccountState;
  categories: CategoriesState;
  shops: ShopsState;
  items: ItemsState;
}
