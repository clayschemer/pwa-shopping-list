import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { Account } from '../../models/account.model';
import type { Category } from '../../models/category.model';
import type { Item } from '../../models/item.model';
import type { Session } from '../../models/session.model';
import type { Shop } from '../../models/shop.model';
import type { User } from '../../models/user.model';
import type { StreamError } from '../../models/errors.model';

export interface EntityChange<T> {
  entity: T;
  changeType: 'added' | 'modified' | 'removed';
}

export type EntityChangeBatch<T> = EntityChange<T>[];

/**
 * Central change stream hub. The backend implementation (Firebase or future SSE)
 * connects here. NgRx effects subscribe to the typed per-entity observables.
 * Nothing outside this service touches the raw stream.
 */
@Injectable({ providedIn: 'root' })
export class ChangeStreamService {
  // TODO: connect to backend implementation
  readonly itemChanges$: Observable<EntityChangeBatch<Item>> = new Subject();
  readonly categoryChanges$: Observable<EntityChangeBatch<Category>> = new Subject();
  readonly shopChanges$: Observable<EntityChangeBatch<Shop>> = new Subject();
  readonly sessionChanges$: Observable<EntityChangeBatch<Session>> = new Subject();
  readonly accountChanges$: Observable<EntityChangeBatch<Account>> = new Subject();
  readonly userChanges$: Observable<EntityChangeBatch<User>> = new Subject();
  readonly streamError$: Observable<StreamError> = new Subject();
}
