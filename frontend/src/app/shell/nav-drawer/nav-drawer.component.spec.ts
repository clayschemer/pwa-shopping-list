import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { of, EMPTY } from 'rxjs';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { NavDrawerComponent } from './nav-drawer.component';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { accountReducer } from '../../store/account/account.reducer';
import { shopsActions } from '../../store/shops/shops.actions';
import { uiActions } from '../../store/ui/ui.actions';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string, categoryOrder: string[]): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: categoryOrder as CategoryId[],
  priceSearchUrl: null,
});

describe('NavDrawerComponent', () => {
  let fixture: ComponentFixture<NavDrawerComponent>;
  let component: NavDrawerComponent;
  let store: Store;
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => EMPTY }) };
    await TestBed.configureTestingModule({
      imports: [NavDrawerComponent, provideTranslocoTesting()],
      providers: [
        provideStore({
          shops: shopsReducer,
          ui: uiReducer,
          account: accountReducer,
        }),
        { provide: MatDialog, useValue: dialog },
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

  it('renders the shop-layout label and a trigger button, not a mat-select', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('mat-select')).toBeFalsy();
    expect(el.textContent).toContain('Current shop layout');
    expect(el.querySelector('.app-nav-drawer__shop-trigger')).toBeTruthy();
  });

  it('shows the currently selected shop name in the trigger, with a chevron', () => {
    store.dispatch(uiActions.planModeShopSelected({ shopId: 's1' as ShopId }));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.app-nav-drawer__shop-trigger') as HTMLElement;
    expect(trigger.textContent).toContain('Tesco');
    const icons = trigger.querySelectorAll('mat-icon');
    expect(icons[icons.length - 1]?.textContent).toContain('chevron_right');
  });

  it('shows the Global fallback when no shop is selected', () => {
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.app-nav-drawer__shop-trigger') as HTMLElement;
    expect(trigger.textContent).toContain('Global');
  });

  it('opens the shop-picker dialog when the trigger is clicked', () => {
    store.dispatch(uiActions.planModeShopSelected({ shopId: 's1' as ShopId }));
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.app-nav-drawer__shop-trigger') as HTMLElement).click();
    expect(dialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: {
          shops: [shop('s1', 'Tesco', []), shop('s2', 'Lidl', [])],
          selectedShopId: 's1',
        },
      }),
    );
  });

  it('dispatches planModeShopSelected with the dialog result when a shop is chosen', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of('s2' as ShopId) });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.app-nav-drawer__shop-trigger') as HTMLElement).click();
    expect(dispatchSpy).toHaveBeenCalledWith(
      uiActions.planModeShopSelected({ shopId: 's2' as ShopId }),
    );
  });

  it('does not dispatch anything when the dialog is dismissed without a choice', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.app-nav-drawer__shop-trigger') as HTMLElement).click();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('renders Categories, Manage shops, History and Settings links', () => {
    const el: HTMLElement = fixture.nativeElement;
    const labels = Array.from(el.querySelectorAll('.app-nav-drawer__manage-shops')).map((b) => {
      const clone = b.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('mat-icon').forEach((icon) => icon.remove());
      return clone.textContent?.trim();
    });
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
