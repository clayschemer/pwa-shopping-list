import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  addDoc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import type { Session } from '../../models/session.model';
import type { SessionId, ShopId, UserId } from '../../models/ids.model';
import type {
  NotFoundError,
  SessionConflictError,
} from '../../models/errors.model';
import { AccountContext } from './account-context';
import { StreamErrorService } from './stream-error.service';
import { paths } from './firestore-paths';
import { snapshotChanges, type EntityChangeBatch } from './change-stream';
import { mapSession } from './session-mapper';

@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly streamError = inject(StreamErrorService);
  private readonly injector = inject(Injector);

  async fetchActiveSessions(): Promise<Session[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(
        query(paths.sessions(this.db, accountId), where('completedAt', '==', null)),
      ),
    );
    return snap.docs.map((d) => mapSession(d, accountId));
  }

  async fetchSessionHistory(max = 50): Promise<Session[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(
        query(
          paths.sessions(this.db, accountId),
          where('completedAt', '!=', null),
          orderBy('completedAt', 'desc'),
          limit(max),
        ),
      ),
    );
    return snap.docs.map((d) => mapSession(d, accountId));
  }

  async startSession(
    shopId: ShopId | null,
  ): Promise<Session | SessionConflictError> {
    const { accountId, userId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      // Start-or-join: query for an existing active session at this shop
      const existing = await getDocs(
        query(
          paths.sessions(this.db, accountId),
          where('completedAt', '==', null),
          where('shopId', '==', shopId),
        ),
      );

      if (!existing.empty) {
        // Join the existing session if not already a participant
        const existingDoc = existing.docs[0];
        const session = mapSession(existingDoc, accountId);
        if (!session.participants.includes(userId as UserId)) {
          const ref = paths.sessionDoc(this.db, accountId, session.id);
          await runTransaction(this.db, async (tx) => {
            tx.update(ref, { participants: arrayUnion(userId) });
          });
          session.participants = [...session.participants, userId as UserId];
        }
        return session;
      }

      const startedAt = Date.now();
      const payload = {
        shopId,
        participants: [userId],
        startedBy: userId,
        startedAt,
        completedAt: null,
        checkedItems: [],
      };
      const ref = await addDoc(paths.sessions(this.db, accountId), payload);

      return {
        id: ref.id as SessionId,
        accountId,
        shopId,
        participants: [userId as UserId],
        startedBy: userId,
        startedAt,
        completedAt: null,
        checkedItems: [],
      };
    });
  }

  async joinSession(id: SessionId): Promise<Session | NotFoundError> {
    const { accountId, userId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      try {
        await runTransaction(this.db, async (tx) => {
          const ref = paths.sessionDoc(this.db, accountId, id);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('NOT_FOUND');
          tx.update(ref, { participants: arrayUnion(userId) });
        });
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'session', id };
        }
        throw err;
      }
      const all = await getDocs(paths.sessions(this.db, accountId));
      const doc = all.docs.find((d) => d.id === id);
      if (!doc) return { type: 'NOT_FOUND', entityKind: 'session', id };
      return mapSession(doc, accountId);
    });
  }

  async closeSession(id: SessionId): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const sessionRef = paths.sessionDoc(this.db, accountId, id);

      try {
        await runTransaction(this.db, async (tx) => {
          const snap = await tx.get(sessionRef);
          if (!snap.exists()) throw new Error('NOT_FOUND');
          const data = snap.data();
          if (data['completedAt'] !== null) return;
          tx.update(sessionRef, { completedAt: Date.now() });
        });
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'session', id };
        }
        throw err;
      }

      // Increment purchaseCount on all items from the session log.
      const finalSnap = await getDocs(paths.sessions(this.db, accountId));
      const sessionDoc = finalSnap.docs.find((d) => d.id === id);
      if (!sessionDoc) return;
      const checked = (sessionDoc.data()['checkedItems'] ?? []) as {
        itemId: string;
      }[];
      const itemIds = Array.from(new Set(checked.map((c) => c.itemId)));
      if (itemIds.length === 0) return;

      const batch = writeBatch(this.db);
      for (const itemId of itemIds) {
        const ref = paths.itemDoc(this.db, accountId, itemId);
        const itemSnap = await getDoc(ref);
        if (!itemSnap.exists()) continue;
        const current = (itemSnap.data()['purchaseCount'] ?? 0) as number;
        batch.update(ref, { purchaseCount: current + 1 });
      }
      await batch.commit();
      return;
    });
  }

  async discardSession(id: SessionId): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const sessionRef = paths.sessionDoc(this.db, accountId, id);

      // Read the session to get the checked items before discarding
      let checkedItemIds: string[];
      try {
        const snap = await runTransaction(this.db, async (tx) => {
          const s = await tx.get(sessionRef);
          if (!s.exists()) throw new Error('NOT_FOUND');
          const data = s.data();
          if (data['completedAt'] !== null) return null; // already completed
          const checked = (data['checkedItems'] ?? []) as { itemId: string }[];
          // Clear checkedItems and set completedAt in one transaction
          tx.update(sessionRef, {
            checkedItems: [],
            completedAt: Date.now(),
          });
          return checked.map((c) => c.itemId);
        });
        if (snap === null) return; // already completed — nothing to do
        checkedItemIds = Array.from(new Set(snap));
      } catch (err) {
        if ((err as Error).message === 'NOT_FOUND') {
          return { type: 'NOT_FOUND', entityKind: 'session', id };
        }
        throw err;
      }

      // Restore all checked items (set removed = false, removedAt = null)
      if (checkedItemIds.length === 0) return;
      const batch = writeBatch(this.db);
      for (const itemId of checkedItemIds) {
        const ref = paths.itemDoc(this.db, accountId, itemId);
        const itemSnap = await getDoc(ref);
        if (!itemSnap.exists()) continue;
        batch.update(ref, { removed: false, removedAt: null });
      }
      await batch.commit();
      return;
    });
  }

  sessionChanges$(): Observable<EntityChangeBatch<Session>> {
    const ctx = this.context.current();
    if (!ctx) {
      return new Observable<EntityChangeBatch<Session>>();
    }
    return snapshotChanges(
      paths.sessions(this.db, ctx.accountId),
      (snap) => mapSession(snap, ctx.accountId),
      this.streamError,
    );
  }
}
