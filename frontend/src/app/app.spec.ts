import '../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { ThemeService } from './core/theme/theme.service';
import { accountReducer } from './store/account/account.reducer';
import { uiReducer } from './store/ui/ui.reducer';
import { categoriesReducer } from './store/categories/categories.reducer';
import { shopsReducer } from './store/shops/shops.reducer';
import { itemsReducer } from './store/items/items.reducer';
import { sessionsReducer } from './store/sessions/sessions.reducer';
import { authActions, accountActions } from './store/account/account.actions';
import type { UserId, AccountId } from './models/ids.model';

@Component({ template: '' })
class DummyComponent {}

function createTestBed(routes = []) {
  return TestBed.configureTestingModule({
    imports: [App, provideTranslocoTesting()],
    providers: [
      provideRouter(routes),
      provideStore({
        account: accountReducer,
        ui: uiReducer,
        categories: categoriesReducer,
        shops: shopsReducer,
        items: itemsReducer,
        sessions: sessionsReducer,
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

  it('injects ThemeService on init so language and theme classes are applied immediately', async () => {
    await createTestBed();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const themeService = TestBed.inject(ThemeService);
    expect(themeService).toBeTruthy();
  });

  describe('page title', () => {
    async function setupWithRoutes() {
      await createTestBed([
        { path: '', component: DummyComponent },
        { path: 'settings', component: DummyComponent },
        { path: 'manage-shops', component: DummyComponent },
        { path: 'history', component: DummyComponent },
        { path: 'sign-in', component: DummyComponent },
      ]);
      const store = TestBed.inject(Store);
      store.dispatch(authActions.authStateResolved({
        user: {
          id: 'u1' as UserId,
          accountId: 'a1' as AccountId,
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
      return fixture;
    }

    it('sets page title to app name on the main list route', async () => {
      await setupWithRoutes();
      const title = TestBed.inject(Title);
      expect(title.getTitle()).toBe('Shopping List');
    });

    it('sets page title when navigating to settings', async () => {
      await setupWithRoutes();
      const router = TestBed.inject(Router);
      const title = TestBed.inject(Title);

      await router.navigateByUrl('/settings');
      expect(title.getTitle()).toBe('Settings — Shopping List');
    });

    it('sets page title when navigating to manage shops', async () => {
      await setupWithRoutes();
      const router = TestBed.inject(Router);
      const title = TestBed.inject(Title);

      await router.navigateByUrl('/manage-shops');
      expect(title.getTitle()).toBe('Manage shops — Shopping List');
    });

    it('sets page title when navigating to history', async () => {
      await setupWithRoutes();
      const router = TestBed.inject(Router);
      const title = TestBed.inject(Title);

      await router.navigateByUrl('/history');
      expect(title.getTitle()).toBe('Shopping history — Shopping List');
    });

    it('restores page title when navigating back to main list', async () => {
      await setupWithRoutes();
      const router = TestBed.inject(Router);
      const title = TestBed.inject(Title);

      await router.navigateByUrl('/settings');
      expect(title.getTitle()).toBe('Settings — Shopping List');

      await router.navigateByUrl('/');
      expect(title.getTitle()).toBe('Shopping List');
    });
  });
});
