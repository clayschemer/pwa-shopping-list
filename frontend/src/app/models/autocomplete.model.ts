import type { CategoryId, ItemId } from './ids.model';

export interface AutocompleteItem {
  id: ItemId;
  name: string;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
  purchaseCount: number;
}
