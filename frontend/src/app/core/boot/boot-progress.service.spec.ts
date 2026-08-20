import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { BootProgressService } from './boot-progress.service';
import { accountReducer } from '../../store/account/account.reducer';
import { itemsReducer } from '../../store/items/items.reducer';
import { categoriesReducer } from '../../store/categories/categories.reducer';
import { categoryGroupsReducer } from '../../store/category-groups/category-groups.reducer';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { sessionsReducer } from '../../store/sessions/sessions.reducer';
import { authActions, accountActions } from '../../store/account/account.actions';
import { itemsActions } from '../../store/items/items.actions';
import { categoriesActions } from '../../store/categories/categories.actions';
import { categoryGroupsActions } from '../../store/category-groups/category-groups.actions';
import { shopsActions } from '../../store/shops/shops.actions';
import { sessionsActions } from '../../store/sessions/sessions.actions';
import type { AccountId, UserId } from '../../models/ids.model';

const user = {
  id: 'u1' as UserId,
  accountId: 'a1' as AccountId,
  email: 't@t.com',
  displayName: 'T',
};
const account = { id: 'a1' as AccountId, name: 'A', aiConfig: null };

describe('BootProgressService', () => {
  let service: BootProgressService;
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [provideTranslocoTesting()],
      providers: [
        provideStore({
          account: accountReducer,
          items: itemsReducer,
          categories: categoriesReducer,
          categoryGroups: categoryGroupsReducer,
          shops: shopsReducer,
          sessions: sessionsReducer,
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    service = TestBed.inject(BootProgressService);
  });

  /** Drives every remaining milestone to completion. */
  function completeBoot(): void {
    store.dispatch(authActions.authStateResolved({ user }));
    store.dispatch(accountActions.accountLoaded({ account, selectedShopId: null }));
    store.dispatch(itemsActions.itemsLoaded({ items: [] }));
    store.dispatch(categoriesActions.categoriesLoaded({ categories: [] }));
    store.dispatch(categoryGroupsActions.categoryGroupsLoaded({ groups: [] }));
    store.dispatch(shopsActions.shopsLoaded({ shops: [] }));
    store.dispatch(sessionsActions.sessionsLoaded({ sessions: [] }));
  }

  describe('percent', () => {
    it('starts at the pre-boot base plus translations, which the test harness preloads', () => {
      expect(service.percent()).toBe(45);
    });

    it('credits auth resolution before the account has loaded', () => {
      store.dispatch(authActions.authStateResolved({ user }));
      expect(service.percent()).toBe(60);
    });

    it('credits the account once it resolves', () => {
      store.dispatch(authActions.authStateResolved({ user }));
      store.dispatch(accountActions.accountLoaded({ account, selectedShopId: null }));
      expect(service.percent()).toBe(75);
    });

    it('reaches exactly 100 once every milestone is done', () => {
      completeBoot();
      expect(service.percent()).toBe(100);
    });

    it('never moves backwards as milestones land out of order', () => {
      const seen: number[] = [service.percent()];
      store.dispatch(sessionsActions.sessionsLoaded({ sessions: [] }));
      seen.push(service.percent());
      store.dispatch(itemsActions.itemsLoaded({ items: [] }));
      seen.push(service.percent());
      store.dispatch(authActions.authStateResolved({ user }));
      seen.push(service.percent());

      const ascending = [...seen].sort((a, b) => a - b);
      expect(seen).toEqual(ascending);
    });
  });

  describe('phase label', () => {
    it('names auth while the auth state is still resolving', () => {
      expect(service.phaseKey()).toBe('boot.signingIn');
    });

    it('names the account once auth resolves but the account has not', () => {
      store.dispatch(authActions.authStateResolved({ user }));
      expect(service.phaseKey()).toBe('boot.loadingAccount');
    });

    it('names the list once the account is in place', () => {
      store.dispatch(authActions.authStateResolved({ user }));
      store.dispatch(accountActions.accountLoaded({ account, selectedShopId: null }));
      expect(service.phaseKey()).toBe('boot.loadingList');
    });
  });

  describe('detail', () => {
    it('reports a language-neutral identifier for the outstanding milestone', () => {
      store.dispatch(authActions.authStateResolved({ user }));
      store.dispatch(accountActions.accountLoaded({ account, selectedShopId: null }));
      expect(service.detail()).toBe('items · categories · shops · sessions');
    });
  });

  describe('complete', () => {
    it('is false while anything is still outstanding', () => {
      expect(service.complete()).toBe(false);
    });

    it('is true once every milestone has landed', () => {
      completeBoot();
      expect(service.complete()).toBe(true);
    });

    /**
     * Boot is over when the user has to act: the sign-in screen is a destination,
     * not a loading state, and leaving the card up would cover it forever.
     */
    it('is true when auth resolves to a screen that needs the user', () => {
      store.dispatch(authActions.authStateEmpty());
      expect(service.complete()).toBe(true);
    });

    it('is true when the account is denied', () => {
      store.dispatch(authActions.authStateResolved({ user }));
      store.dispatch(accountActions.accessDenied());
      expect(service.complete()).toBe(true);
    });
  });
});
