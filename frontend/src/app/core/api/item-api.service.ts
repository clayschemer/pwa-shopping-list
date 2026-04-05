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
  serverTimestamp,
  runTransaction,
} from '@angular/fire/firestore';
import type { Item } from '../../models/item.model';
import type { ItemId, CategoryId, AccountId, SessionId, UserId } from '../../models/ids.model';
import type {
  NameConflictError,
  NotFoundError,
  CheckConflictError,
} from '../../models/errors.model';
import type { Session } from '../../models/session.model';

export interface CheckSuccess {
  type: 'CHECK_SUCCESS';
  item: Item;
  session: Session;
}

/**
 * Item API service — implements §5.4 of API-CONTRACT.md.
 * The ONLY place that touches Firestore for item operations.
 */
@Injectable({ providedIn: 'root' })
export class ItemApiService {
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

  private toItem(id: string, accountId: AccountId, d: Record<string, unknown>): Item {
    return {
      id: id as ItemId,
      accountId,
      name: d['name'] as string,
      description: (d['description'] as string | null) ?? null,
      quantity: (d['quantity'] as number | null) ?? null,
      unit: (d['unit'] as string | null) ?? null,
      primaryCategoryId: (d['primaryCategoryId'] as CategoryId | null) ?? null,
      secondaryCategoryIds: (d['secondaryCategoryIds'] as CategoryId[] | undefined) ?? [],
      removed: (d['removed'] as boolean) ?? false,
      removedAt: (d['removedAt'] as number | null) ?? null,
      addedBy: (d['addedBy'] as 'user' | 'ai') ?? 'user',
      aiMotivation: (d['aiMotivation'] as string | null) ?? null,
      price: (d['price'] as number | null) ?? null,
      priceQuantity: (d['priceQuantity'] as number | null) ?? null,
      priceUnit: (d['priceUnit'] as string | null) ?? null,
      priceUpdatedAt: (d['priceUpdatedAt'] as number | null) ?? null,
      purchaseCount: (d['purchaseCount'] as number) ?? 0,
    };
  }

  async fetchActiveList(): Promise<Item[]> {
    const accountId = await this.accountId();
    const snap = await getDocs(
      query(
        collection(this.firestore, 'accounts', accountId, 'items'),
        where('removed', '==', false),
      ),
    );
    return snap.docs.map((d) => this.toItem(d.id, accountId, d.data()));
  }

  async addItem(input: {
    name: string;
    description: string | null;
    quantity: number | null;
    unit: string | null;
    primaryCategoryId: CategoryId | null;
    secondaryCategoryIds: CategoryId[];
  }): Promise<Item | NameConflictError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'items');
    const existing = await getDocs(
      query(ref, where('name', '==', input.name), where('removed', '==', false)),
    );
    if (!existing.empty) return { type: 'NAME_CONFLICT', entityKind: 'item', name: input.name };

    const data = {
      ...input,
      accountId,
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
    const newRef = await addDoc(ref, data);
    return this.toItem(newRef.id, accountId, data);
  }

  async updateItem(input: {
    id: ItemId;
    name: string;
    description: string | null;
    quantity: number | null;
    unit: string | null;
    primaryCategoryId: CategoryId | null;
    secondaryCategoryIds: CategoryId[];
  }): Promise<Item | NotFoundError | NameConflictError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'items');
    const conflict = await getDocs(
      query(ref, where('name', '==', input.name), where('removed', '==', false)),
    );
    if (!conflict.empty && conflict.docs[0].id !== input.id) {
      return { type: 'NAME_CONFLICT', entityKind: 'item', name: input.name };
    }
    const docRef = doc(this.firestore, 'accounts', accountId, 'items', input.id);
    const { id, ...updates } = input;
    await updateDoc(docRef, updates);
    const snap = await getDocs(query(ref));
    const found = snap.docs.find((d) => d.id === input.id);
    if (!found) return { type: 'NOT_FOUND', entityKind: 'item', id: input.id };
    return this.toItem(found.id, accountId, found.data());
  }

  async setItemPrice(
    id: ItemId,
    price: number | null,
    priceQuantity: number | null,
    priceUnit: string | null,
  ): Promise<void | NotFoundError> {
    const accountId = await this.accountId();
    const docRef = doc(this.firestore, 'accounts', accountId, 'items', id);
    await updateDoc(docRef, {
      price,
      priceQuantity,
      priceUnit,
      priceUpdatedAt: price !== null ? Date.now() : null,
    });
  }

  async removeItem(id: ItemId): Promise<void | NotFoundError> {
    const accountId = await this.accountId();
    const docRef = doc(this.firestore, 'accounts', accountId, 'items', id);
    await updateDoc(docRef, { removed: true, removedAt: Date.now() });
  }

  async checkItem(
    id: ItemId,
    sessionId: SessionId,
  ): Promise<CheckSuccess | CheckConflictError> {
    const accountId = await this.accountId();
    const uid = this.auth.currentUser?.uid as UserId;
    const itemRef = doc(this.firestore, 'accounts', accountId, 'items', id);
    const sessionRef = doc(this.firestore, 'accounts', accountId, 'sessions', sessionId);

    try {
      const result = await runTransaction(this.firestore, async (tx) => {
        const itemSnap = await tx.get(itemRef);
        if (!itemSnap.exists()) throw new Error('NOT_FOUND');
        const itemData = itemSnap.data();
        if (itemData['removed']) throw new Error('CHECK_CONFLICT');

        const sessionSnap = await tx.get(sessionRef);
        if (!sessionSnap.exists()) throw new Error('NOT_FOUND');
        const sessionData = sessionSnap.data();

        const now = Date.now();
        const checkedEntry = {
          itemId: id,
          checkedBy: uid,
          checkedAt: now,
          priceSnapshot: itemData['price'] ?? null,
          priceQuantitySnapshot: itemData['priceQuantity'] ?? null,
          priceUnitSnapshot: itemData['priceUnit'] ?? null,
        };

        tx.update(itemRef, { removed: true, removedAt: now });
        tx.update(sessionRef, {
          checkedItems: [...(sessionData['checkedItems'] ?? []), checkedEntry],
        });

        return { itemData, sessionData, checkedEntry, now };
      });

      const item = this.toItem(id, accountId, {
        ...result.itemData,
        removed: true,
        removedAt: result.now,
      });
      const session: Session = {
        id: sessionId,
        accountId,
        shopId: result.sessionData['shopId'] ?? null,
        participants: result.sessionData['participants'] ?? [],
        startedBy: result.sessionData['startedBy'] as UserId,
        startedAt: result.sessionData['startedAt'] as number,
        completedAt: null,
        checkedItems: [
          ...(result.sessionData['checkedItems'] ?? []),
          result.checkedEntry,
        ],
      };
      return { type: 'CHECK_SUCCESS', item, session };
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'CHECK_CONFLICT') {
        return { type: 'CHECK_CONFLICT', itemId: id };
      }
      throw e;
    }
  }

  async uncheckItem(id: ItemId, sessionId: SessionId): Promise<void | NotFoundError> {
    const accountId = await this.accountId();
    const itemRef = doc(this.firestore, 'accounts', accountId, 'items', id);
    const sessionRef = doc(this.firestore, 'accounts', accountId, 'sessions', sessionId);

    await runTransaction(this.firestore, async (tx) => {
      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists()) throw new Error('NOT_FOUND');
      const checkedItems = (sessionSnap.data()['checkedItems'] ?? []).filter(
        (ci: { itemId: string }) => ci.itemId !== id,
      );
      tx.update(itemRef, { removed: false, removedAt: null });
      tx.update(sessionRef, { checkedItems });
    });
  }
}
