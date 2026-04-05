import type { AccountState } from './account/account.reducer';
import type { CategoriesState } from './categories/categories.reducer';
import type { ShopsState } from './shops/shops.reducer';
import type { ItemsState } from './items/items.reducer';
import type { SessionsState } from './sessions/sessions.reducer';
import type { UiState } from './ui/ui.reducer';

export interface AppState {
  account: AccountState;
  categories: CategoriesState;
  shops: ShopsState;
  items: ItemsState;
  sessions: SessionsState;
  ui: UiState;
}
