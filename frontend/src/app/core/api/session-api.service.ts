import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import type { Session } from '../../models/session.model';
import type {
  AccountId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';
import type {
  NotFoundError,
  SessionConflictError,
} from '../../models/errors.model';

@Injectable({ providedIn: 'root' })
export class SessionApiService {
  async fetchActiveSessions(): Promise<Session[]> {
    return [];
  }

  async startSession(
    shopId: ShopId | null,
  ): Promise<Session | SessionConflictError> {
    return {
      id: `session-${Date.now()}` as SessionId,
      accountId: '' as AccountId,
      shopId,
      participants: ['' as UserId],
      startedBy: '' as UserId,
      startedAt: Date.now(),
      completedAt: null,
      checkedItems: [],
    };
  }

  async joinSession(id: SessionId): Promise<Session | NotFoundError> {
    return {
      id,
      accountId: '' as AccountId,
      shopId: null,
      participants: ['' as UserId],
      startedBy: '' as UserId,
      startedAt: Date.now(),
      completedAt: null,
      checkedItems: [],
    };
  }

  async closeSession(id: SessionId): Promise<void | NotFoundError> {}

  sessionChanges$(): Observable<never> {
    return EMPTY;
  }
}
