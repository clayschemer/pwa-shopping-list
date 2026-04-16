import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  orderBy,
} from '@angular/fire/firestore';
import type { Category } from '../../models/category.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';
import { AccountContext } from './account-context';
import { StreamErrorService } from './stream-error.service';
import { paths } from './firestore-paths';
import { snapshotChanges, type EntityChangeBatch } from './change-stream';

function mapCategory(snap: QueryDocumentSnapshot, accountId: AccountId): Category {
  const data = snap.data();
  return {
    id: snap.id as CategoryId,
    accountId,
    name: (data['name'] ?? '') as string,
    globalSortOrder: (data['globalSortOrder'] ?? 0) as number,
  };
}

@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly streamError = inject(StreamErrorService);
  private readonly injector = inject(Injector);

  async fetchAllCategories(): Promise<Category[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(query(paths.categories(this.db, accountId), orderBy('globalSortOrder'))),
    );
    return snap.docs.map((d) => mapCategory(d, accountId));
  }

  async addCategory(name: string): Promise<Category | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = name.trim();
      const existing = await getDocs(
        query(paths.categories(this.db, accountId), where('name', '==', trimmed)),
      );
      if (!existing.empty) {
        return { type: 'NAME_CONFLICT', entityKind: 'category', name: trimmed };
      }

      const allCats = await getDocs(paths.categories(this.db, accountId));
      const nextOrder =
        allCats.docs.reduce(
          (max, d) => Math.max(max, (d.data()['globalSortOrder'] ?? 0) as number),
          -1,
        ) + 1;

      const ref = await addDoc(paths.categories(this.db, accountId), {
        name: trimmed,
        globalSortOrder: nextOrder,
      });

      // Append the new category to every shop's categoryOrder.
      const shopsSnap = await getDocs(paths.shops(this.db, accountId));
      if (!shopsSnap.empty) {
        const batch = writeBatch(this.db);
        for (const shopDoc of shopsSnap.docs) {
          const current = (shopDoc.data()['categoryOrder'] ?? []) as string[];
          if (!current.includes(ref.id)) {
            batch.update(shopDoc.ref, { categoryOrder: [...current, ref.id] });
          }
        }
        await batch.commit();
      }

      return {
        id: ref.id as CategoryId,
        accountId,
        name: trimmed,
        globalSortOrder: nextOrder,
      };
    });
  }

  async renameCategory(
    id: CategoryId,
    name: string,
  ): Promise<Category | NotFoundError | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = name.trim();
      const conflict = await getDocs(
        query(paths.categories(this.db, accountId), where('name', '==', trimmed)),
      );
      if (conflict.docs.some((d) => d.id !== id)) {
        return { type: 'NAME_CONFLICT', entityKind: 'category', name: trimmed };
      }
      const ref = paths.categoryDoc(this.db, accountId, id);
      try {
        await updateDoc(ref, { name: trimmed });
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'category', id };
      }
      const snap = await getDocs(
        query(paths.categories(this.db, accountId), where('name', '==', trimmed)),
      );
      const doc = snap.docs.find((d) => d.id === id);
      if (!doc) {
        return { type: 'NOT_FOUND', entityKind: 'category', id };
      }
      return mapCategory(doc, accountId);
    });
  }

  async deleteCategory(id: CategoryId): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const categoryRef = paths.categoryDoc(this.db, accountId, id);

      // Remove from all shops' categoryOrder.
      const shopsSnap = await getDocs(paths.shops(this.db, accountId));
      const batch = writeBatch(this.db);
      for (const shopDoc of shopsSnap.docs) {
        const current = (shopDoc.data()['categoryOrder'] ?? []) as string[];
        if (current.includes(id)) {
          batch.update(shopDoc.ref, {
            categoryOrder: current.filter((c) => c !== id),
          });
        }
      }

      // Clear from items (primary → null, secondary → filter out).
      const itemsByPrimary = await getDocs(
        query(paths.items(this.db, accountId), where('primaryCategoryId', '==', id)),
      );
      for (const itemDoc of itemsByPrimary.docs) {
        batch.update(itemDoc.ref, { primaryCategoryId: null });
      }
      const itemsBySecondary = await getDocs(
        query(
          paths.items(this.db, accountId),
          where('secondaryCategoryIds', 'array-contains', id),
        ),
      );
      for (const itemDoc of itemsBySecondary.docs) {
        const current = (itemDoc.data()['secondaryCategoryIds'] ?? []) as string[];
        batch.update(itemDoc.ref, {
          secondaryCategoryIds: current.filter((c) => c !== id),
        });
      }

      batch.delete(categoryRef);
      try {
        await batch.commit();
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'category', id };
      }
      return;
    });
  }

  async setGlobalCategoryOrder(orderedIds: CategoryId[]): Promise<void> {
    const { accountId } = this.context.require();
    await runInInjectionContext(this.injector, async () => {
      const batch = writeBatch(this.db);
      orderedIds.forEach((id, index) => {
        batch.update(paths.categoryDoc(this.db, accountId, id), {
          globalSortOrder: index,
        });
      });
      await batch.commit();
    });
  }

  async setShopCategoryOrder(
    shopId: ShopId,
    orderedIds: CategoryId[],
  ): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        await runTransaction(this.db, async (tx) => {
          const ref = paths.shopDoc(this.db, accountId, shopId);
          const snap = await tx.get(ref);
          if (!snap.exists()) {
            throw new Error('NOT_FOUND');
          }
          tx.update(ref, { categoryOrder: orderedIds });
        });
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'shop', id: shopId };
        }
        throw err;
      }
      return;
    });
  }

  categoryChanges$(): Observable<EntityChangeBatch<Category>> {
    const ctx = this.context.current();
    if (!ctx) {
      return new Observable<EntityChangeBatch<Category>>();
    }
    return snapshotChanges(
      paths.categories(this.db, ctx.accountId),
      (snap) => mapCategory(snap, ctx.accountId),
      this.streamError,
    );
  }
}
