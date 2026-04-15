import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import type { Category } from '../../models/category.model';
import type { CategoryId, AccountId, ShopId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';

@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  async fetchAllCategories(): Promise<Category[]> {
    // Stub: return mock categories
    return [
      { id: 'cat-produce' as CategoryId, accountId: '' as AccountId, name: 'Produce', globalSortOrder: 0 },
      { id: 'cat-dairy' as CategoryId, accountId: '' as AccountId, name: 'Dairy', globalSortOrder: 1 },
      { id: 'cat-bakery' as CategoryId, accountId: '' as AccountId, name: 'Bakery', globalSortOrder: 2 },
      { id: 'cat-frozen' as CategoryId, accountId: '' as AccountId, name: 'Frozen', globalSortOrder: 3 },
      { id: 'cat-drinks' as CategoryId, accountId: '' as AccountId, name: 'Drinks', globalSortOrder: 4 },
    ];
  }

  async addCategory(name: string): Promise<Category | NameConflictError> {
    // Stub: return mock category with generated id
    return {
      id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}` as CategoryId,
      accountId: '' as AccountId,
      name,
      globalSortOrder: Date.now(),
    };
  }

  async renameCategory(id: CategoryId, name: string): Promise<void | NotFoundError | NameConflictError> {
    // Stub: no-op
  }

  async deleteCategory(id: CategoryId): Promise<void | NotFoundError> {
    // Stub: no-op
  }

  async setGlobalCategoryOrder(orderedIds: CategoryId[]): Promise<void> {
    // Stub: no-op
  }

  async setShopCategoryOrder(shopId: ShopId, orderedIds: CategoryId[]): Promise<void | NotFoundError> {
    // Stub: no-op
  }

  categoryChanges$(): Observable<never> {
    // Stub: no emissions until Firebase implementation
    return EMPTY;
  }
}
