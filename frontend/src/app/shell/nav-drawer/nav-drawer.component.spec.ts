import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { NavDrawerComponent } from './nav-drawer.component';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { accountReducer } from '../../store/account/account.reducer';
import { shopsActions } from '../../store/shops/shops.actions';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string, categoryOrder: string[]): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: categoryOrder as CategoryId[],
});

describe('NavDrawerComponent', () => {
  let fixture: ComponentFixture<NavDrawerComponent>;
  let component: NavDrawerComponent;
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavDrawerComponent, provideTranslocoTesting()],
      providers: [
        provideStore({
          shops: shopsReducer,
          ui: uiReducer,
          account: accountReducer,
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    store.dispatch(
      shopsActions.shopsLoaded({
        shops: [shop('s1', 'Tesco', []), shop('s2', 'Lidl', [])],
      }),
    );

    fixture = TestBed.createComponent(NavDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the shop-layout dropdown', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('mat-select')).toBeTruthy();
  });

  it('renders Categories, Manage shops, History and Settings links', () => {
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.app-nav-drawer__manage-shops'))
      .map((b) => b.textContent?.trim());
    expect(labels).toEqual([
      'Categories',
      'Stores…',
      'History…',
      'Settings…',
    ]);
  });

  it('emits viewCategories when the Categories link is clicked', () => {
    let emitted = false;
    component.viewCategories.subscribe(() => (emitted = true));
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.app-nav-drawer__categories') as HTMLElement;
    link.click();
    expect(emitted).toBe(true);
  });

  it('emits manageShops when the Stores link is clicked', () => {
    let emitted = false;
    component.manageShops.subscribe(() => (emitted = true));
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.app-nav-drawer__stores') as HTMLElement;
    link.click();
    expect(emitted).toBe(true);
  });

  it('emits viewSettings when the Settings link is clicked', () => {
    let emitted = false;
    component.viewSettings.subscribe(() => (emitted = true));
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.app-nav-drawer__settings') as HTMLElement;
    link.click();
    expect(emitted).toBe(true);
  });
});
