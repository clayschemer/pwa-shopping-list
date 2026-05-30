import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  addDoc,
  getDocs,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  updateDoc,
  where,
  orderBy,
  writeBatch,
} from '@angular/fire/firestore';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';
import { AccountContext } from './account-context';
import { StreamErrorService } from './stream-error.service';
import { paths } from './firestore-paths';
import { snapshotChanges, type EntityChangeBatch } from './change-stream';

function mapShop(snap: QueryDocumentSnapshot, accountId: AccountId): Shop {
  const data = snap.data();
  return {
    id: snap.id as ShopId,
    accountId,
    name: (data['name'] ?? '') as string,
    categoryOrder: ((data['categoryOrder'] ?? []) as string[]).map(
      (id) => id as CategoryId,
    ),
    priceSearchUrl: (data['priceSearchUrl'] as string | null) ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class ShopApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly streamError = inject(StreamErrorService);
  private readonly injector = inject(Injector);

  async fetchAllShops(): Promise<Shop[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(query(paths.shops(this.db, accountId), orderBy('name'))),
    );
    return snap.docs.map((d) => mapShop(d, accountId));
  }

  async addShop(name: string): Promise<Shop | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = name.trim();
      const existing = await getDocs(
        query(paths.shops(this.db, accountId), where('name', '==', trimmed)),
      );
      if (!existing.empty) {
        return { type: 'NAME_CONFLICT', entityKind: 'shop', name: trimmed };
      }

      const catsSnap = await getDocs(
        query(paths.categories(this.db, accountId), orderBy('globalSortOrder')),
      );
      const categoryOrder = catsSnap.docs.map((d) => d.id);

      const ref = await addDoc(paths.shops(this.db, accountId), {
        name: trimmed,
        categoryOrder,
        priceSearchUrl: null,
      });

      return {
        id: ref.id as ShopId,
        accountId,
        name: trimmed,
        categoryOrder: categoryOrder.map((c) => c as CategoryId),
        priceSearchUrl: null,
      };
    });
  }

  async renameShop(
    id: ShopId,
    name: string,
  ): Promise<Shop | NotFoundError | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = name.trim();
      const conflict = await getDocs(
        query(paths.shops(this.db, accountId), where('name', '==', trimmed)),
      );
      if (conflict.docs.some((d) => d.id !== id)) {
        return { type: 'NAME_CONFLICT', entityKind: 'shop', name: trimmed };
      }
      const ref = paths.shopDoc(this.db, accountId, id);
      try {
        await updateDoc(ref, { name: trimmed });
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'shop', id };
      }
      const snap = await getDocs(
        query(paths.shops(this.db, accountId), where('name', '==', trimmed)),
      );
      const doc = snap.docs.find((d) => d.id === id);
      if (!doc) {
        return { type: 'NOT_FOUND', entityKind: 'shop', id };
      }
      return mapShop(doc, accountId);
    });
  }

  async deleteShop(id: ShopId): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const batch = writeBatch(this.db);
      batch.delete(paths.shopDoc(this.db, accountId, id));
      try {
        await batch.commit();
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'shop', id };
      }
      return;
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

  async setShopPriceUrl(
    id: ShopId,
    url: string | null,
  ): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        await updateDoc(paths.shopDoc(this.db, accountId, id), { priceSearchUrl: url });
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'shop', id };
      }
      return;
    });
  }

  shopChanges$(): Observable<EntityChangeBatch<Shop>> {
    const ctx = this.context.current();
    if (!ctx) {
      return new Observable<EntityChangeBatch<Shop>>();
    }
    return snapshotChanges(
      paths.shops(this.db, ctx.accountId),
      (snap) => mapShop(snap, ctx.accountId),
      this.streamError,
    );
  }
}
