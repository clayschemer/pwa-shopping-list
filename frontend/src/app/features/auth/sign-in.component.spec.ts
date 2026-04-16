import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { SignInComponent } from './sign-in.component';
import { selectAuthStatus, selectSignInError, selectIsAuthChecking } from '../../store/account/account.selectors';
import type { AuthStatus } from '../../store/account/account.reducer';

describe('SignInComponent', () => {
  let store: MockStore;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  function setup(initialStatus: AuthStatus = 'unauthenticated') {
    router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [provideTranslocoTesting()],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectAuthStatus, value: initialStatus },
            { selector: selectSignInError, value: null },
            { selector: selectIsAuthChecking, value: false },
          ],
        }),
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(MockStore);
    const fixture = TestBed.createComponent(SignInComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('redirects to / when auth status becomes authenticated', () => {
    setup('unauthenticated');

    store.overrideSelector(selectAuthStatus, 'authenticated');
    store.refreshState();
    TestBed.flushEffects();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('redirects to /access-denied when auth status becomes access_denied', () => {
    setup('unauthenticated');

    store.overrideSelector(selectAuthStatus, 'access_denied');
    store.refreshState();
    TestBed.flushEffects();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/access-denied');
  });

  it('does not redirect while status is checking or loading', () => {
    setup('checking');

    store.overrideSelector(selectAuthStatus, 'loading');
    store.refreshState();
    TestBed.flushEffects();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not redirect when status is unauthenticated', () => {
    setup('unauthenticated');
    TestBed.flushEffects();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
