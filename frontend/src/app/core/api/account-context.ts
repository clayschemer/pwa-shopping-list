import { Injectable, signal } from '@angular/core';
import type { AccountId, UserId } from '../../models/ids.model';

interface Context {
  accountId: AccountId;
  userId: UserId;
}

/**
 * Shared account context populated by AccountApiService once getAccount() resolves.
 * API services read the current account/user identifiers from here rather than
 * threading them through every call.
 */
@Injectable({ providedIn: 'root' })
export class AccountContext {
  private readonly context = signal<Context | null>(null);

  set(accountId: AccountId, userId: UserId): void {
    this.context.set({ accountId, userId });
  }

  clear(): void {
    this.context.set(null);
  }

  require(): Context {
    const ctx = this.context();
    if (!ctx) {
      throw new Error('AccountContext is not set — API called before account resolved');
    }
    return ctx;
  }

  current(): Context | null {
    return this.context();
  }
}
