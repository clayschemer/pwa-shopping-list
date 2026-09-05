import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  Firestore,
} from '@angular/fire/firestore';
import type { AccountId } from '../../models/ids.model';

export const paths = {
  userAllowlistDoc(db: Firestore, uid: string): DocumentReference {
    return doc(db, 'users', uid);
  },

  accountDoc(db: Firestore, accountId: AccountId): DocumentReference {
    return doc(db, 'accounts', accountId);
  },

  members(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'users');
  },

  memberDoc(db: Firestore, accountId: AccountId, userId: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'users', userId);
  },

  categories(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'categories');
  },

  categoryDoc(db: Firestore, accountId: AccountId, id: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'categories', id);
  },

  categoryGroups(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'categoryGroups');
  },

  categoryGroupDoc(db: Firestore, accountId: AccountId, id: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'categoryGroups', id);
  },

  shops(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'shops');
  },

  shopDoc(db: Firestore, accountId: AccountId, id: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'shops', id);
  },

  items(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'items');
  },

  itemDoc(db: Firestore, accountId: AccountId, id: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'items', id);
  },

  sessions(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'sessions');
  },

  sessionDoc(db: Firestore, accountId: AccountId, id: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'sessions', id);
  },

  priceFeedback(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'priceFeedback');
  },

  priceQueue(db: Firestore, accountId: AccountId): CollectionReference {
    return collection(db, 'accounts', accountId, 'price-queue');
  },

  priceQueueDoc(db: Firestore, accountId: AccountId, itemId: string): DocumentReference {
    return doc(db, 'accounts', accountId, 'price-queue', itemId);
  },
} as const;
