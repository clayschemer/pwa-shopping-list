import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  addDoc,
  doc,
  getDocs,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  arrayUnion,
} from '@angular/fire/firestore';
import type { Item, PriceFeedbackEntry } from '../../models/item.model';
import type {
  AccountId,
  CategoryId,
  ItemId,
  SessionId,
  ShopId,
} from '../../models/ids.model';
import type {
  CheckConflictError,
  NameConflictError,
  NotFoundError,
} from '../../models/errors.model';
import type { Session } from '../../models/session.model';
import type { AutocompleteItem } from '../../models/autocomplete.model';
import { AccountContext } from './account-context';
import { StreamErrorService } from './stream-error.service';
import { paths } from './firestore-paths';
import { snapshotChanges, type EntityChangeBatch } from './change-stream';
import { mapSession } from './session-mapper';

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
  sizePerPieceQuantity: number | null;
  sizePerPieceUnit: string | null;
}

export interface UpdateItemInput extends AddItemInput {
  id: ItemId;
}

function toMillis(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return null;
}

function mapFeedback(raw: unknown): PriceFeedbackEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PriceFeedbackEntry[] = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const rejectedName = typeof e['rejectedName'] === 'string' ? e['rejectedName'] : null;
    const reason = typeof e['reason'] === 'string' ? e['reason'] : null;
    if (!rejectedName || !reason) continue;
    out.push({
      rejectedName,
      rejectedUrl: typeof e['rejectedUrl'] === 'string' ? e['rejectedUrl'] : null,
      reason,
      timestamp: toMillis(e['timestamp']) ?? 0,
    });
  }
  return out;
}

export function mapItem(snap: QueryDocumentSnapshot, accountId: AccountId): Item {
  const data = snap.data();
  return {
    id: snap.id as ItemId,
    accountId,
    name: (data['name'] ?? '') as string,
    description: (data['description'] ?? null) as string | null,
    quantity: (data['quantity'] ?? null) as number | null,
    unit: (data['unit'] ?? null) as string | null,
    primaryCategoryId: (data['primaryCategoryId'] ?? null) as CategoryId | null,
    secondaryCategoryIds: ((data['secondaryCategoryIds'] ?? []) as string[]).map(
      (c) => c as CategoryId,
    ),
    removed: Boolean(data['removed']),
    removedAt: toMillis(data['removedAt']),
    addedBy: (data['addedBy'] ?? 'user') as 'user' | 'ai',
    aiMotivation: (data['aiMotivation'] ?? null) as string | null,
    price: (data['price'] ?? null) as number | null,
    priceQuantity: (data['priceQuantity'] ?? null) as number | null,
    priceUnit: (data['priceUnit'] ?? null) as string | null,
    priceShopId: (data['priceShopId'] ?? null) as ShopId | null,
    priceProductName: (data['priceProductName'] ?? null) as string | null,
    priceProductUrl: (data['priceProductUrl'] ?? null) as string | null,
    priceSearchUrl: (data['priceSearchUrl'] ?? null) as string | null,
    priceFeedback: mapFeedback(data['priceFeedback']),
    priceUpdatedAt: toMillis(data['priceUpdatedAt']),
    priceAttemptedAt: toMillis(data['priceAttemptedAt']),
    sizePerPieceQuantity: (data['sizePerPieceQuantity'] ?? null) as number | null,
    sizePerPieceUnit: (data['sizePerPieceUnit'] ?? null) as string | null,
    purchaseCount: (data['purchaseCount'] ?? 0) as number,
  };
}

@Injectable({ providedIn: 'root' })
export class ItemApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly streamError = inject(StreamErrorService);
  private readonly injector = inject(Injector);

  async fetchActiveList(): Promise<Item[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(query(paths.items(this.db, accountId), where('removed', '==', false))),
    );
    return snap.docs.map((d) => mapItem(d, accountId));
  }

  async addItem(input: AddItemInput): Promise<Item | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = input.name.trim();
      const existing = await getDocs(
        query(
          paths.items(this.db, accountId),
          where('name', '==', trimmed),
          where('removed', '==', false),
        ),
      );
      if (!existing.empty) {
        return { type: 'NAME_CONFLICT', entityKind: 'item', name: trimmed };
      }

      const payload = {
        name: trimmed,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        primaryCategoryId: input.primaryCategoryId,
        secondaryCategoryIds: input.secondaryCategoryIds,
        removed: false,
        removedAt: null,
        addedBy: 'user' as const,
        aiMotivation: null,
        price: null,
        priceQuantity: null,
        priceUnit: null,
        priceShopId: null,
        priceProductName: null,
        priceProductUrl: null,
        priceSearchUrl: null,
        priceFeedback: [] as PriceFeedbackEntry[],
        priceUpdatedAt: null,
        priceAttemptedAt: null,
        sizePerPieceQuantity: input.sizePerPieceQuantity,
        sizePerPieceUnit: input.sizePerPieceUnit,
        purchaseCount: 0,
      };

      const ref = await addDoc(paths.items(this.db, accountId), payload);

      return {
        id: ref.id as ItemId,
        accountId,
        ...payload,
      };
    });
  }

  async updateItem(
    input: UpdateItemInput,
  ): Promise<Item | NotFoundError | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = input.name.trim();
      const conflict = await getDocs(
        query(
          paths.items(this.db, accountId),
          where('name', '==', trimmed),
          where('removed', '==', false),
        ),
      );
      if (conflict.docs.some((d) => d.id !== input.id)) {
        return { type: 'NAME_CONFLICT', entityKind: 'item', name: trimmed };
      }

      try {
        await runTransaction(this.db, async (tx) => {
          const ref = paths.itemDoc(this.db, accountId, input.id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('NOT_FOUND');
          tx.update(ref, {
            name: trimmed,
            description: input.description,
            quantity: input.quantity,
            unit: input.unit,
            primaryCategoryId: input.primaryCategoryId,
            secondaryCategoryIds: input.secondaryCategoryIds,
            sizePerPieceQuantity: input.sizePerPieceQuantity,
            sizePerPieceUnit: input.sizePerPieceUnit,
          });
        });
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'item', id: input.id };
        }
        throw err;
      }

      const snap = await getDocs(
        query(paths.items(this.db, accountId), where('name', '==', trimmed)),
      );
      const doc = snap.docs.find((d) => d.id === input.id);
      if (!doc) return { type: 'NOT_FOUND', entityKind: 'item', id: input.id };
      return mapItem(doc, accountId);
    });
  }

  async setItemPrice(
    id: ItemId,
    price: number | null,
    priceQuantity: number | null,
    priceUnit: string | null,
    shopId: ShopId | null = null,
  ): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        // Manually-entered prices have no pipeline-matched product, so clear
        // productName/Url alongside the price write. Clearing also runs when
        // price itself is cleared.
        await updateDoc(paths.itemDoc(this.db, accountId, id), {
          price,
          priceQuantity,
          priceUnit,
          priceShopId: price === null ? null : shopId,
          priceProductName: null,
          priceProductUrl: null,
          priceSearchUrl: null,
          priceUpdatedAt: price === null ? null : serverTimestamp(),
        });
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'item', id };
      }
      return;
    });
  }

  async submitPriceFeedback(
    id: ItemId,
    reason: string,
  ): Promise<void | NotFoundError> {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new Error('submitPriceFeedback requires a non-empty reason');
    }
    const { accountId, userId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        // Resolve category name for the corpus record before opening the
        // transaction — keeps the transaction cost low and avoids unrelated
        // reads being retried on contention.
        const itemRef = paths.itemDoc(this.db, accountId, id);

        await runTransaction(this.db, async (tx) => {
          const snap = await tx.get(itemRef);
          if (!snap.exists()) throw new Error('NOT_FOUND');
          const data = snap.data();

          const categoryId = (data['primaryCategoryId'] ?? null) as string | null;
          let categoryName: string | null = null;
          if (categoryId) {
            const catSnap = await tx.get(
              paths.categoryDoc(this.db, accountId, categoryId),
            );
            categoryName = catSnap.exists()
              ? ((catSnap.data()['name'] ?? null) as string | null)
              : null;
          }

          const rejectedName = (data['priceProductName'] ?? data['name'] ?? '') as string;
          const rejectedUrl = (data['priceProductUrl'] ?? null) as string | null;

          const entry: PriceFeedbackEntry = {
            rejectedName,
            rejectedUrl,
            reason: trimmed,
            timestamp: Date.now(),
          };

          tx.update(itemRef, {
            priceFeedback: arrayUnion(entry),
            priceUpdatedAt: null,
            priceAttemptedAt: null,
          });

          // Append-only corpus write — never read back; sized for future
          // model-training export.
          const corpusRef = doc(paths.priceFeedback(this.db, accountId));
          tx.set(corpusRef, {
            itemId: id,
            itemName: (data['name'] ?? '') as string,
            description: (data['description'] ?? null) as string | null,
            categoryName,
            shopId: (data['priceShopId'] ?? null) as string | null,
            reason: trimmed,
            createdBy: userId,
            createdAt: serverTimestamp(),
          });
        });
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'item', id };
        }
        throw err;
      }
      return;
    });
  }

  async removeItem(id: ItemId): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        await updateDoc(paths.itemDoc(this.db, accountId, id), {
          removed: true,
          removedAt: serverTimestamp(),
        });
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'item', id };
      }
      return;
    });
  }

  async checkItem(
    id: ItemId,
    sessionId: SessionId,
  ): Promise<CheckSuccess | CheckConflictError> {
    const { accountId, userId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const itemRef = paths.itemDoc(this.db, accountId, id);
      const sessionRef = paths.sessionDoc(this.db, accountId, sessionId);

      try {
        const result = await runTransaction(this.db, async (tx) => {
          const itemSnap = await tx.get(itemRef);
          const sessionSnap = await tx.get(sessionRef);
          if (!itemSnap.exists() || !sessionSnap.exists()) {
            throw new Error('NOT_FOUND');
          }
          const itemData = itemSnap.data();
          if (itemData['removed'] === true) {
            throw new Error('CHECK_CONFLICT');
          }
          const checkedAt = Date.now();
          const checkedEntry = {
            itemId: id,
            checkedBy: userId,
            checkedAt,
            priceSnapshot: itemData['price'] ?? null,
            priceQuantitySnapshot: itemData['priceQuantity'] ?? null,
            priceUnitSnapshot: itemData['priceUnit'] ?? null,
            nameSnapshot: (itemData['name'] ?? null) as string | null,
            quantitySnapshot: (itemData['quantity'] ?? null) as number | null,
            unitSnapshot: (itemData['unit'] ?? null) as string | null,
          };
          tx.update(itemRef, { removed: true, removedAt: checkedAt });
          tx.update(sessionRef, {
            checkedItems: arrayUnion(checkedEntry),
          });
          return { checkedEntry };
        });

        // Re-read to return full updated entities.
        const itemSnap2 = (
          await getDocs(
            query(paths.items(this.db, accountId), where('removed', '==', true)),
          )
        ).docs.find((d) => d.id === id);
        const sessionDocs = await getDocs(paths.sessions(this.db, accountId));
        const sessionDoc = sessionDocs.docs.find((d) => d.id === sessionId);
        if (!itemSnap2 || !sessionDoc) {
          return { type: 'CHECK_CONFLICT', itemId: id } satisfies CheckConflictError;
        }
        return {
          type: 'CHECK_SUCCESS',
          item: mapItem(itemSnap2, accountId),
          session: mapSession(sessionDoc, accountId),
        };
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'CHECK_CONFLICT' || msg === 'NOT_FOUND') {
          return { type: 'CHECK_CONFLICT', itemId: id };
        }
        throw err;
      }
    });
  }

  async uncheckItem(
    id: ItemId,
    sessionId: SessionId,
  ): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        await runTransaction(this.db, async (tx) => {
          const itemRef = paths.itemDoc(this.db, accountId, id);
          const sessionRef = paths.sessionDoc(this.db, accountId, sessionId);
          const itemSnap = await tx.get(itemRef);
          const sessionSnap = await tx.get(sessionRef);
          if (!itemSnap.exists() || !sessionSnap.exists()) {
            throw new Error('NOT_FOUND');
          }
          const existing = (sessionSnap.data()['checkedItems'] ?? []) as {
            itemId: string;
          }[];
          const filtered = existing.filter((ci) => ci.itemId !== id);
          tx.update(itemRef, { removed: false, removedAt: null });
          tx.update(sessionRef, { checkedItems: filtered });
        });
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'item', id };
        }
        throw err;
      }
      return;
    });
  }

  async fetchAutocompleteItems(): Promise<AutocompleteItem[]> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const snap = await getDocs(paths.items(this.db, accountId));
      return snap.docs
        .map((d) => mapItem(d, accountId))
        .map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          primaryCategoryId: i.primaryCategoryId,
          purchaseCount: i.purchaseCount,
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount);
    });
  }

  itemChanges$(): Observable<EntityChangeBatch<Item>> {
    const ctx = this.context.current();
    if (!ctx) {
      return new Observable<EntityChangeBatch<Item>>();
    }
    return snapshotChanges(
      paths.items(this.db, ctx.accountId),
      (snap) => mapItem(snap, ctx.accountId),
      this.streamError,
    );
  }
}

