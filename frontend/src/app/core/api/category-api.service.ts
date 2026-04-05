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
  writeBatch,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import type { Category } from '../../models/category.model';
import type { CategoryId, AccountId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';

/**
 * Category API service — implements §5.5 of API-CONTRACT.md.
 * The ONLY place that touches Firestore for category operations.
 */
@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  private async accountId(): Promise<AccountId> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const userSnap = await getDocs(
      query(collection(this.firestore, 'users'), where('uid', '==', uid)),
    );
    return userSnap.docs[0]?.data()['accountId'] as AccountId;
  }

  async fetchAllCategories(): Promise<Category[]> {
    const accountId = await this.accountId();
    const snap = await getDocs(
      query(
        collection(this.firestore, 'accounts', accountId, 'categories'),
        orderBy('globalSortOrder'),
      ),
    );
    return snap.docs.map((d) => ({
      id: d.id as CategoryId,
      accountId,
      name: d.data()['name'] as string,
      globalSortOrder: d.data()['globalSortOrder'] as number,
    }));
  }

  async addCategory(name: string): Promise<Category | NameConflictError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'categories');
    const existing = await getDocs(query(ref, where('name', '==', name)));
    if (!existing.empty) return { type: 'NAME_CONFLICT', entityKind: 'category', name };

    const allCats = await getDocs(query(ref, orderBy('globalSortOrder', 'desc')));
    const maxOrder = allCats.empty ? -1 : (allCats.docs[0].data()['globalSortOrder'] as number);

    const newRef = await addDoc(ref, {
      name,
      globalSortOrder: maxOrder + 1,
      accountId,
    });
    return { id: newRef.id as CategoryId, accountId, name, globalSortOrder: maxOrder + 1 };
  }

  async renameCategory(
    id: CategoryId,
    name: string,
  ): Promise<Category | NotFoundError | NameConflictError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'categories');
    const docRef = doc(this.firestore, 'accounts', accountId, 'categories', id);

    const conflict = await getDocs(query(ref, where('name', '==', name)));
    if (!conflict.empty && conflict.docs[0].id !== id) {
      return { type: 'NAME_CONFLICT', entityKind: 'category', name };
    }

    await updateDoc(docRef, { name });
    const snap = await getDocs(query(ref, where('__name__', '==', id)));
    if (snap.empty) return { type: 'NOT_FOUND', entityKind: 'category', id };
    const d = snap.docs[0].data();
    return { id, accountId, name, globalSortOrder: d['globalSortOrder'] as number };
  }

  async deleteCategory(id: CategoryId): Promise<void | NotFoundError> {
    const accountId = await this.accountId();
    const docRef = doc(this.firestore, 'accounts', accountId, 'categories', id);
    await deleteDoc(docRef);
  }

  async setGlobalCategoryOrder(orderedIds: CategoryId[]): Promise<void> {
    const accountId = await this.accountId();
    const batch = writeBatch(this.firestore);
    orderedIds.forEach((id, idx) => {
      const ref = doc(this.firestore, 'accounts', accountId, 'categories', id);
      batch.update(ref, { globalSortOrder: idx });
    });
    await batch.commit();
  }
}
