import '../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { of, EMPTY } from 'rxjs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { App } from './app';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { ThemeService } from './core/theme/theme.service';
import { accountReducer } from './store/account/account.reducer';
import { uiReducer } from './store/ui/ui.reducer';
import { uiActions } from './store/ui/ui.actions';
import { categoriesReducer } from './store/categories/categories.reducer';
import { shopsReducer } from './store/shops/shops.reducer';
import { shopsActions } from './store/shops/shops.actions';
import { itemsReducer } from './store/items/items.reducer';
import { sessionsReducer } from './store/sessions/sessions.reducer';
import { authActions, accountActions } from './store/account/account.actions';
import type { UserId, AccountId, ShopId } from './models/ids.model';
import type { Shop } from './models/shop.model';

@Component({ template: '' })
class DummyComponent {}

function createTestBed(routes = [], extraProviders: unknown[] = []) {
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
      ...extraProviders,
    ],
  }).compileComponents();
}

function authenticate(store: Store): void {
  store.dispatch(authActions.authStateResolved({
    user: { id: 'u1' as UserId, accountId: 'a1' as AccountId, email: 't@t.com', displayName: 'T' },
  }));
  store.dispatch(accountActions.accountLoaded({
    account: { id: 'a1' as AccountId, name: 'A', aiConfig: null },
    selectedShopId: null,
  }));
}

const shop = (id: string, name: string): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [],
  priceSearchUrl: null,
});

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

  // DESIGN.md: spinners are for inline action feedback only, never page-level loading.
  it('uses a shell skeleton rather than a spinner while auth is checking', async () => {
    await createTestBed();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-shell-skeleton')).toBeTruthy();
    expect(el.querySelector('mat-spinner')).toBeFalsy();
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
      selectedShopId: null,
    }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-root__top-bar')).toBeTruthy();
  });

  it('renders the filter button (not Settings icon) in plan-mode right slot', async () => {
    await createTestBed();
    const store = TestBed.inject(Store);
    store.dispatch(authActions.authStateResolved({
      user: { id: 'u1' as UserId, accountId: 'a1' as AccountId, email: 't@t.com', displayName: 'T' },
    }));
    store.dispatch(accountActions.accountLoaded({
      account: { id: 'a1' as AccountId, name: 'A', aiConfig: null },
      selectedShopId: null,
    }));

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-root__filter-btn')).toBeTruthy();
    expect(el.querySelector('.app-root__settings-btn')).toBeFalsy();
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
        { path: 'stores', component: DummyComponent },
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

    it('sets page title when navigating to stores', async () => {
      await setupWithRoutes();
      const router = TestBed.inject(Router);
      const title = TestBed.inject(Title);

      await router.navigateByUrl('/stores');
      expect(title.getTitle()).toBe('Stores — Shopping List');
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

  describe('shop banner', () => {
    const bannerRoutes = [
      { path: '', component: DummyComponent },
      { path: 'shop', component: DummyComponent },
      { path: 'categories', component: DummyComponent },
      { path: 'settings', component: DummyComponent },
      { path: 'stores', component: DummyComponent },
      { path: 'history', component: DummyComponent },
    ];

    async function setupBanner() {
      const bottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => EMPTY }) };
      const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => EMPTY }) };
      await createTestBed(bannerRoutes, [
        { provide: MatBottomSheet, useValue: bottomSheet },
        { provide: MatDialog, useValue: dialog },
      ]);
      const store = TestBed.inject(Store);
      authenticate(store);
      store.dispatch(shopsActions.shopsLoaded({ shops: [shop('s1', 'Tesco'), shop('s2', 'Lidl')] }));

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      return { fixture, store, router, bottomSheet, dialog };
    }

    it('shows the banner in plan mode', async () => {
      const { fixture } = await setupBanner();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-shop-banner')).toBeTruthy();
    });

    it('shows the banner in shop mode', async () => {
      const { fixture, store } = await setupBanner();
      store.dispatch(uiActions.switchToShopModeWithShop({ shopId: null }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-shop-banner')).toBeTruthy();
    });

    it('shows the banner on /categories', async () => {
      const { fixture, router } = await setupBanner();
      await router.navigateByUrl('/categories');
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-shop-banner')).toBeTruthy();
    });

    it('hides the banner on /settings, /stores, and /history', async () => {
      const { fixture, router } = await setupBanner();
      for (const path of ['/settings', '/stores', '/history']) {
        await router.navigateByUrl(path);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('app-shop-banner')).toBeFalsy();
      }
    });

    it('hides the banner while the nav drawer is open, and shows it again once closed', async () => {
      const { fixture, store } = await setupBanner();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-shop-banner')).toBeTruthy();

      store.dispatch(uiActions.navDrawerOpened());
      fixture.detectChanges();
      expect(el.querySelector('app-shop-banner')).toBeFalsy();

      store.dispatch(uiActions.navDrawerClosed());
      fixture.detectChanges();
      expect(el.querySelector('app-shop-banner')).toBeTruthy();
    });

    it('selectedShopName reflects the selected shop entity', async () => {
      const { fixture, store } = await setupBanner();
      store.dispatch(uiActions.planModeShopSelected({ shopId: 's1' as ShopId }));
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedShopName()).toBe('Tesco');
    });

    it('selectedShopName is null when no shop is selected', async () => {
      const { fixture } = await setupBanner();
      expect(fixture.componentInstance.selectedShopName()).toBe(null);
    });

    it('onShopBannerShopSelected dispatches planModeShopSelected', async () => {
      const { fixture, store } = await setupBanner();
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.componentInstance.onShopBannerShopSelected('s2' as ShopId);
      expect(dispatchSpy).toHaveBeenCalledWith(
        uiActions.planModeShopSelected({ shopId: 's2' as ShopId }),
      );
    });

    it('onShopBannerChangeRequested: dispatches switchToPlanMode when that action is chosen', async () => {
      const { fixture, store, dialog } = await setupBanner();
      dialog.open.mockReturnValue({ afterClosed: () => of('switch-to-plan') });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.componentInstance.onShopBannerChangeRequested();
      expect(dialog.open).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(uiActions.switchToPlanMode());
    });

    it('onShopBannerChangeRequested: opens the shop-select sheet when starting another session, dispatching switchToShopModeWithShop on result', async () => {
      const { fixture, store, dialog, bottomSheet } = await setupBanner();
      dialog.open.mockReturnValue({ afterClosed: () => of('start-session') });
      bottomSheet.open.mockReturnValue({ afterDismissed: () => of({ shopId: 's2' as ShopId }) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.componentInstance.onShopBannerChangeRequested();
      expect(bottomSheet.open).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        uiActions.switchToShopModeWithShop({ shopId: 's2' as ShopId }),
      );
    });

    it('does not dispatch anything when the change dialog is cancelled', async () => {
      const { fixture, store, dialog } = await setupBanner();
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.componentInstance.onShopBannerChangeRequested();
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('the checkout pill always renders the money total, never shop-name text', async () => {
      const { fixture, store } = await setupBanner();
      store.dispatch(uiActions.switchToShopModeWithShop({ shopId: 's1' as ShopId }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const pill = el.querySelector('.app-root__session-pill');
      expect(pill?.textContent).toContain('£0.00');
      expect(pill?.textContent).not.toContain('Tesco');
      expect(el.querySelector('.app-root__session-pill-sub')).toBeFalsy();
    });
  });
});
