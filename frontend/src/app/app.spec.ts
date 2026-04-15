import '../testing/init-testbed';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { accountReducer } from './store/account/account.reducer';
import { uiReducer } from './store/ui/ui.reducer';
import { categoriesReducer } from './store/categories/categories.reducer';
import { shopsReducer } from './store/shops/shops.reducer';
import { authActions, accountActions } from './store/account/account.actions';
import type { UserId, AccountId } from './models/ids.model';

function createTestBed() {
  return TestBed.configureTestingModule({
    imports: [App, provideTranslocoTesting()],
    providers: [
      provideRouter([]),
      provideStore({
        account: accountReducer,
        ui: uiReducer,
        categories: categoriesReducer,
        shops: shopsReducer,
      }),
      provideEffects([]),
    ],
  }).compileComponents();
}

describe('App', () => {
  it('should create the app', async () => {
    await createTestBed();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('hides top bar and sidenav when unauthenticated', async () => {
    await createTestBed();
    const store = TestBed.inject(Store);
    store.dispatch(authActions.authStateEmpty());

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-root__top-bar')).toBeFalsy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('shows loading indicator when auth status is checking', async () => {
    await createTestBed();
    // Initial state is 'checking'
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-root__top-bar')).toBeFalsy();
    expect(el.querySelector('.app-root__loading')).toBeTruthy();
  });

  it('shows top bar when authenticated', async () => {
    await createTestBed();
    const store = TestBed.inject(Store);
    store.dispatch(authActions.authStateResolved({
      user: {
        id: 'u1' as UserId,
        accountId: '' as AccountId,
        email: 'test@test.com',
        displayName: 'Test',
      },
    }));
    store.dispatch(accountActions.accountLoaded({
      account: {
        id: 'a1' as AccountId,
        name: 'Test Account',
        aiConfig: null,
      },
    }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-root__top-bar')).toBeTruthy();
  });
});
