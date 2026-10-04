import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import {
  PendingVerificationComponent,
  RELOAD_PAGE,
} from './pending-verification.component';
import { selectCurrentUser } from '../../store/account/account.selectors';
import { authActions } from '../../store/account/account.actions';
import type { UserId, AccountId } from '../../models/ids.model';

describe('PendingVerificationComponent', () => {
  let store: MockStore;
  let reload: ReturnType<typeof vi.fn>;

  function setup(user: { email: string } | null) {
    reload = vi.fn();
    TestBed.configureTestingModule({
      imports: [provideTranslocoTesting()],
      providers: [
        provideMockStore({
          selectors: [
            {
              selector: selectCurrentUser,
              value: user
                ? {
                    id: 'u1' as UserId,
                    accountId: '' as AccountId,
                    email: user.email,
                    displayName: user.email,
                  }
                : null,
            },
          ],
        }),
        { provide: RELOAD_PAGE, useValue: reload },
      ],
    });
    store = TestBed.inject(MockStore);
    const fixture = TestBed.createComponent(PendingVerificationComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the user email in the message', () => {
    const fixture = setup({ email: 'test@example.com' });
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('test@example.com');
  });

  it('calls the injected reload hook when reload button is clicked', () => {
    const fixture = setup({ email: 'test@example.com' });
    fixture.componentInstance.reloadNow();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('dispatches signOutRequested when switch-account button is clicked', () => {
    const fixture = setup({ email: 'test@example.com' });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.switchAccount();
    expect(dispatchSpy).toHaveBeenCalledWith(authActions.signOutRequested());
  });
});
