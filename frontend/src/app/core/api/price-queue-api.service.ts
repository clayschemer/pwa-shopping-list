import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, serverTimestamp, setDoc } from '@angular/fire/firestore';
import type { ItemId } from '../../models/ids.model';
import { AccountContext } from './account-context';
import { paths } from './firestore-paths';

export type QueueReason = 'unpriced' | 'stale' | 'reactivated';

@Injectable({ providedIn: 'root' })
export class PriceQueueApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly injector = inject(Injector);

  async enqueue(itemId: ItemId, reason: QueueReason): Promise<void> {
    const { accountId } = this.context.require();
    await runInInjectionContext(this.injector, () =>
      setDoc(paths.priceQueueDoc(this.db, accountId, itemId), {
        queuedAt: serverTimestamp(),
        reason,
      }),
    );
  }
}
