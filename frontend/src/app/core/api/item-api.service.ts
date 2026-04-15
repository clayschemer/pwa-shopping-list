import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import type { Item } from '../../models/item.model';
import type {
  AccountId,
  CategoryId,
  ItemId,
  SessionId,
} from '../../models/ids.model';
import type {
  CheckConflictError,
  NameConflictError,
  NotFoundError,
} from '../../models/errors.model';
import type { Session } from '../../models/session.model';
import type { AutocompleteItem } from '../../models/autocomplete.model';

export interface CheckSuccess {
  type: 'CHECK_SUCCESS';
  item: Item;
  session: Session;
}

export interface AddItemInput {
  name: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
  secondaryCategoryIds: CategoryId[];
}

export interface UpdateItemInput extends AddItemInput {
  id: ItemId;
}

@Injectable({ providedIn: 'root' })
export class ItemApiService {
  async fetchActiveList(): Promise<Item[]> {
    return [];
  }

  async addItem(input: AddItemInput): Promise<Item | NameConflictError> {
    return {
      id: `item-${Date.now()}` as ItemId,
      accountId: '' as AccountId,
      name: input.name,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      primaryCategoryId: input.primaryCategoryId,
      secondaryCategoryIds: input.secondaryCategoryIds,
      removed: false,
      removedAt: null,
      addedBy: 'user',
      aiMotivation: null,
      price: null,
      priceQuantity: null,
      priceUnit: null,
      priceUpdatedAt: null,
      purchaseCount: 0,
    };
  }

  async updateItem(
    input: UpdateItemInput,
  ): Promise<Item | NotFoundError | NameConflictError> {
    return {
      id: input.id,
      accountId: '' as AccountId,
      name: input.name,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      primaryCategoryId: input.primaryCategoryId,
      secondaryCategoryIds: input.secondaryCategoryIds,
      removed: false,
      removedAt: null,
      addedBy: 'user',
      aiMotivation: null,
      price: null,
      priceQuantity: null,
      priceUnit: null,
      priceUpdatedAt: null,
      purchaseCount: 0,
    };
  }

  async setItemPrice(
    id: ItemId,
    price: number | null,
    priceQuantity: number | null,
    priceUnit: string | null,
  ): Promise<void | NotFoundError> {}

  async removeItem(id: ItemId): Promise<void | NotFoundError> {}

  async checkItem(
    id: ItemId,
    sessionId: SessionId,
  ): Promise<CheckSuccess | CheckConflictError> {
    return { type: 'CHECK_CONFLICT', itemId: id };
  }

  async uncheckItem(
    id: ItemId,
    sessionId: SessionId,
  ): Promise<void | NotFoundError> {}

  async fetchAutocompleteItems(): Promise<AutocompleteItem[]> {
    return [];
  }

  itemChanges$(): Observable<never> {
    return EMPTY;
  }
}
