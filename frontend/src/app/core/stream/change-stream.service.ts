import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  query,
  where,
  onSnapshot,
  DocumentChange,
} from '@angular/fire/firestore';
import { Observable, Subject } from 'rxjs';
import type { Account } from '../../models/account.model';
import type { Category } from '../../models/category.model';
import type { Item } from '../../models/item.model';
import type { Session } from '../../models/session.model';
import type { Shop } from '../../models/shop.model';
import type { User } from '../../models/user.model';
import type { StreamError } from '../../models/errors.model';
import type { AccountId, CategoryId, ItemId, SessionId, ShopId, UserId } from '../../models/ids.model';

export interface EntityChange<T> {
  entity: T;
  changeType: 'added' | 'modified' | 'removed';
}

export type EntityChangeBatch<T> = EntityChange<T>[];

type ChangeType = 'added' | 'modified' | 'removed';

function toChangeType(type: DocumentChange['type']): ChangeType {
  return type as ChangeType;
}

/**
 * Central change stream hub. Connects Firestore onSnapshot listeners to typed
 * Observable streams consumed by NgRx effects.
 *
 * Call `connect(accountId)` once after account is loaded.
 * Streams remain hot for the app lifetime; errors surface via streamError$.
 */
@Injectable({ providedIn: 'root' })
export class ChangeStreamService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  private readonly _itemChanges$ = new Subject<EntityChangeBatch<Item>>();
  private readonly _categoryChanges$ = new Subject<EntityChangeBatch<Category>>();
  private readonly _shopChanges$ = new Subject<EntityChangeBatch<Shop>>();
  private readonly _sessionChanges$ = new Subject<EntityChangeBatch<Session>>();
  private readonly _accountChanges$ = new Subject<EntityChangeBatch<Account>>();
  private readonly _userChanges$ = new Subject<EntityChangeBatch<User>>();
  private readonly _streamError$ = new Subject<StreamError>();

  readonly itemChanges$: Observable<EntityChangeBatch<Item>> = this._itemChanges$.asObservable();
  readonly categoryChanges$: Observable<EntityChangeBatch<Category>> = this._categoryChanges$.asObservable();
  readonly shopChanges$: Observable<EntityChangeBatch<Shop>> = this._shopChanges$.asObservable();
  readonly sessionChanges$: Observable<EntityChangeBatch<Session>> = this._sessionChanges$.asObservable();
  readonly accountChanges$: Observable<EntityChangeBatch<Account>> = this._accountChanges$.asObservable();
  readonly userChanges$: Observable<EntityChangeBatch<User>> = this._userChanges$.asObservable();
  readonly streamError$: Observable<StreamError> = this._streamError$.asObservable();

  private readonly unsubscribers: Array<() => void> = [];

  /** Call once, after `getAccount()` resolves, with the authenticated account id. */
  connect(accountId: AccountId): void {
    const base = `accounts/${accountId}`;

    this.unsubscribers.push(
      onSnapshot(
        query(
          collection(this.firestore, base, 'items'),
          where('removed', '==', false),
        ),
        (snap) => {
          const changes = snap.docChanges().map((c) => ({
            entity: this.toItem(c.doc.id, accountId, c.doc.data()),
            changeType: toChangeType(c.type),
          }));
          if (changes.length) this._itemChanges$.next(changes);
        },
        (err) => this._streamError$.next({ type: 'STREAM_FAILED', message: err.message }),
      ),

      onSnapshot(
        collection(this.firestore, base, 'categories'),
        (snap) => {
          const changes = snap.docChanges().map((c) => ({
            entity: this.toCategory(c.doc.id, accountId, c.doc.data()),
            changeType: toChangeType(c.type),
          }));
          if (changes.length) this._categoryChanges$.next(changes);
        },
        (err) => this._streamError$.next({ type: 'STREAM_FAILED', message: err.message }),
      ),

      onSnapshot(
        collection(this.firestore, base, 'shops'),
        (snap) => {
          const changes = snap.docChanges().map((c) => ({
            entity: this.toShop(c.doc.id, accountId, c.doc.data()),
            changeType: toChangeType(c.type),
          }));
          if (changes.length) this._shopChanges$.next(changes);
        },
        (err) => this._streamError$.next({ type: 'STREAM_FAILED', message: err.message }),
      ),

      onSnapshot(
        query(
          collection(this.firestore, base, 'sessions'),
          where('completedAt', '==', null),
        ),
        (snap) => {
          const changes = snap.docChanges().map((c) => ({
            entity: this.toSession(c.doc.id, accountId, c.doc.data()),
            changeType: toChangeType(c.type),
          }));
          if (changes.length) this._sessionChanges$.next(changes);
        },
        (err) => this._streamError$.next({ type: 'STREAM_FAILED', message: err.message }),
      ),
    );
  }

  disconnect(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers.length = 0;
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

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

  private toCategory(id: string, accountId: AccountId, d: Record<string, unknown>): Category {
    return {
      id: id as CategoryId,
      accountId,
      name: d['name'] as string,
      globalSortOrder: (d['globalSortOrder'] as number) ?? 0,
    };
  }

  private toShop(id: string, accountId: AccountId, d: Record<string, unknown>): Shop {
    return {
      id: id as ShopId,
      accountId,
      name: d['name'] as string,
      categoryOrder: (d['categoryOrder'] as CategoryId[] | undefined) ?? [],
    };
  }

  private toSession(id: string, accountId: AccountId, d: Record<string, unknown>): Session {
    return {
      id: id as SessionId,
      accountId,
      shopId: (d['shopId'] as ShopId | null) ?? null,
      participants: (d['participants'] as UserId[]) ?? [],
      startedBy: d['startedBy'] as UserId,
      startedAt: d['startedAt'] as number,
      completedAt: (d['completedAt'] as number | null) ?? null,
      checkedItems: (d['checkedItems'] as Session['checkedItems']) ?? [],
    };
  }
}
