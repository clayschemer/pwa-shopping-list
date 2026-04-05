import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
} from '@angular/fire/firestore';
import type { Session, SessionCheckedItem } from '../../models/session.model';
import type { SessionId, ShopId, AccountId, UserId, ItemId } from '../../models/ids.model';
import type { SessionConflictError, NotFoundError } from '../../models/errors.model';

/**
 * Session API service — implements §5.7 of API-CONTRACT.md.
 * The ONLY place that touches Firestore for session operations.
 */
@Injectable({ providedIn: 'root' })
export class SessionApiService {
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

  private toSession(id: string, accountId: AccountId, d: Record<string, unknown>): Session {
    return {
      id: id as SessionId,
      accountId,
      shopId: (d['shopId'] as ShopId | null) ?? null,
      participants: (d['participants'] as UserId[]) ?? [],
      startedBy: d['startedBy'] as UserId,
      startedAt: d['startedAt'] as number,
      completedAt: (d['completedAt'] as number | null) ?? null,
      checkedItems: (d['checkedItems'] as SessionCheckedItem[]) ?? [],
    };
  }

  async fetchActiveSessions(): Promise<Session[]> {
    const accountId = await this.accountId();
    const snap = await getDocs(
      query(
        collection(this.firestore, 'accounts', accountId, 'sessions'),
        where('completedAt', '==', null),
      ),
    );
    return snap.docs.map((d) => this.toSession(d.id, accountId, d.data()));
  }

  async startSession(shopId: ShopId | null): Promise<Session | SessionConflictError> {
    const accountId = await this.accountId();
    const uid = this.auth.currentUser!.uid as UserId;
    const ref = collection(this.firestore, 'accounts', accountId, 'sessions');

    // Check for existing active session for this user
    const active = await getDocs(
      query(ref, where('completedAt', '==', null)),
    );
    const alreadyActive = active.docs.some((d) =>
      (d.data()['participants'] as string[] ?? []).includes(uid),
    );
    if (alreadyActive) return { type: 'SESSION_CONFLICT' };

    const now = Date.now();
    const data = {
      accountId,
      shopId: shopId ?? null,
      participants: [uid],
      startedBy: uid,
      startedAt: now,
      completedAt: null,
      checkedItems: [],
    };
    const newRef = await addDoc(ref, data);
    return this.toSession(newRef.id, accountId, data);
  }

  async joinSession(sessionId: SessionId): Promise<Session | NotFoundError> {
    const accountId = await this.accountId();
    const uid = this.auth.currentUser!.uid as UserId;
    const ref = collection(this.firestore, 'accounts', accountId, 'sessions');
    const snap = await getDocs(ref);
    const found = snap.docs.find((d) => d.id === sessionId);
    if (!found) return { type: 'NOT_FOUND', entityKind: 'session', id: sessionId };

    const data = found.data();
    const participants = [...(data['participants'] as UserId[] ?? [])];
    if (!participants.includes(uid)) participants.push(uid);
    await updateDoc(doc(this.firestore, 'accounts', accountId, 'sessions', sessionId), {
      participants,
    });
    return this.toSession(sessionId, accountId, { ...data, participants });
  }

  async closeSession(sessionId: SessionId): Promise<Session | NotFoundError> {
    const accountId = await this.accountId();
    const ref = collection(this.firestore, 'accounts', accountId, 'sessions');
    const snap = await getDocs(ref);
    const found = snap.docs.find((d) => d.id === sessionId);
    if (!found) return { type: 'NOT_FOUND', entityKind: 'session', id: sessionId };

    const completedAt = Date.now();
    await updateDoc(
      doc(this.firestore, 'accounts', accountId, 'sessions', sessionId),
      { completedAt },
    );

    // Increment purchaseCount on all checked items
    const data = found.data();
    const checkedItems = (data['checkedItems'] as Array<{ itemId: string }>) ?? [];
    const itemIds = [...new Set(checkedItems.map((ci) => ci.itemId))];
    await Promise.all(
      itemIds.map((itemId) =>
        updateDoc(doc(this.firestore, 'accounts', accountId, 'items', itemId), {
          purchaseCount: (data['purchaseCount'] as number ?? 0) + 1,
        }),
      ),
    );

    return this.toSession(sessionId, accountId, { ...data, completedAt });
  }
}
