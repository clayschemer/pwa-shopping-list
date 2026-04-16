import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  getDocs,
  QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import type { User } from '../../models/user.model';
import type { AccountId, UserId } from '../../models/ids.model';
import { AccountContext } from './account-context';
import { StreamErrorService } from './stream-error.service';
import { paths } from './firestore-paths';
import { snapshotChanges, type EntityChangeBatch } from './change-stream';

function mapUser(snap: QueryDocumentSnapshot, accountId: AccountId): User {
  const data = snap.data();
  return {
    id: snap.id as UserId,
    accountId,
    email: (data['email'] ?? '') as string,
    displayName: (data['displayName'] ?? '') as string,
  };
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly streamError = inject(StreamErrorService);
  private readonly injector = inject(Injector);

  async fetchAccountUsers(): Promise<User[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(paths.members(this.db, accountId)),
    );
    return snap.docs.map((d) => mapUser(d, accountId));
  }

  userChanges$(): Observable<EntityChangeBatch<User>> {
    const ctx = this.context.current();
    if (!ctx) {
      return new Observable<EntityChangeBatch<User>>();
    }
    return snapshotChanges(
      paths.members(this.db, ctx.accountId),
      (snap) => mapUser(snap, ctx.accountId),
      this.streamError,
    );
  }
}
