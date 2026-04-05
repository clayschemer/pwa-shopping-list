import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import type { Shop } from '../../models/shop.model';
import type { ShopId, CategoryId, AccountId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';

/**
 * Shop API service — implements §5.6 of API-CONTRACT.md.
 * The ONLY place that touches Firestore for shop operations.
 */
@Injectable({ providedIn: 'root' })
export class ShopApiService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  private async accountId(): Promise<AccountId> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const snap = await getDocs(
      query(collection(this.firestore, 'users'), where('uid', '==', uid)),
    );
    return snap.docs[0]?.data()['accountId'] as AccountId;
  }

  private toShop(id: string, accountId: AccountId, data: Record<string, unknown>): Shop {
    return {
      id: id as ShopId,
      accountId,
      name: data['name'] as string,
      categoryOrder: (data['categoryOrder'] as string[] | undefined ?? []) as CategoryId[],
    };
  }

  async fetchAllShops(): Promise<Shop[]> {
    const accountId = await this.accountId();
    const snap = await getDocs(
      collection(this.firestore, 'accounts', accountId, 'shops'),
    );
    return snap.docs.map((d) => this.toShop(d.id, accountId, d.data()));
  }

  async addShop(name: string): Promise<Shop | NameConflictError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'shops');
    const existing = await getDocs(query(ref, where('name', '==', name)));
    if (!existing.empty) return { type: 'NAME_CONFLICT', entityKind: 'shop', name };

    // Seed categoryOrder with existing categories in global sort order
    const catsSnap = await getDocs(
      query(
        collection(this.firestore, 'accounts', accountId, 'categories'),
        orderBy('globalSortOrder'),
      ),
    );
    const categoryOrder = catsSnap.docs.map((d) => d.id) as CategoryId[];

    const newRef = await addDoc(ref, { name, categoryOrder, accountId });
    return { id: newRef.id as ShopId, accountId, name, categoryOrder };
  }

  async renameShop(id: ShopId, name: string): Promise<Shop | NotFoundError | NameConflictError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'shops');
    const conflict = await getDocs(query(ref, where('name', '==', name)));
    if (!conflict.empty && conflict.docs[0].id !== id) {
      return { type: 'NAME_CONFLICT', entityKind: 'shop', name };
    }
    const docRef = doc(this.firestore, 'accounts', accountId, 'shops', id);
    await updateDoc(docRef, { name });
    // Re-fetch to return current state
    const snap = await getDocs(query(ref));
    const found = snap.docs.find((d) => d.id === id);
    if (!found) return { type: 'NOT_FOUND', entityKind: 'shop', id };
    return this.toShop(found.id, accountId, found.data());
  }

  async deleteShop(id: ShopId): Promise<void | NotFoundError> {
    const accountId = await this.accountId();
    const docRef = doc(this.firestore, 'accounts', accountId, 'shops', id);
    await deleteDoc(docRef);
  }

  async setShopCategoryOrder(shopId: ShopId, orderedIds: CategoryId[]): Promise<void | NotFoundError> {
    const accountId = await this.accountId();
    const docRef = doc(this.firestore, 'accounts', accountId, 'shops', shopId);
    await updateDoc(docRef, { categoryOrder: orderedIds });
  }
}
