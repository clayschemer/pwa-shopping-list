import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EMPTY } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideRouter } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ManageShopsComponent } from './manage-shops.component';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { categoriesReducer } from '../../store/categories/categories.reducer';
import { accountReducer } from '../../store/account/account.reducer';
import { shopsActions, shopsApiActions } from '../../store/shops/shops.actions';
import type { Shop } from '../../models/shop.model';
import type { AccountId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string, url: string | null = null): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [],
  priceSearchUrl: url,
});

describe('ManageShopsComponent', () => {
  let fixture: ComponentFixture<ManageShopsComponent>;
  let component: ManageShopsComponent;
  let store: Store;
  let bottomSheet: { open: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    bottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => EMPTY }) };
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => EMPTY }) };

    await TestBed.configureTestingModule({
      imports: [ManageShopsComponent, provideTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideStore({
          shops: shopsReducer,
          ui: uiReducer,
          categories: categoriesReducer,
          account: accountReducer,
        }),
        { provide: MatBottomSheet, useValue: bottomSheet },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    store.dispatch(shopsActions.shopsLoaded({
      shops: [shop('s1', 'Tesco', 'https://t/?q={query}'), shop('s2', 'Lidl')],
    }));

    fixture = TestBed.createComponent(ManageShopsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a list of shops in the active shop order', () => {
    const el: HTMLElement = fixture.nativeElement;
    const shopNames = Array.from(el.querySelectorAll('.app-manage-shops__shop-name'))
      .map((e) => e.textContent?.trim());
    expect(shopNames).toEqual(['Tesco', 'Lidl']);
  });

  it('renders a back button', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-manage-shops__back-btn')).toBeTruthy();
  });

  it('renders an add shop FAB', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-manage-shops__fab')).toBeTruthy();
  });

  it('shows the price-search URL when set, and a "missing" hint when not', () => {
    const el: HTMLElement = fixture.nativeElement;
    const urls = Array.from(el.querySelectorAll('.app-manage-shops__shop-url'))
      .map((e) => e.textContent?.trim());
    expect(urls[0]).toContain('https://t/?q={query}');
    expect(urls[1]).toContain('No price-search URL set');
  });

  it('opens the create sheet when FAB is clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const fab = el.querySelector('.app-manage-shops__fab') as HTMLElement;
    fab.click();
    expect(bottomSheet.open).toHaveBeenCalled();
  });

  it('opens the edit sheet when a shop row is tapped', () => {
    const el: HTMLElement = fixture.nativeElement;
    const row = el.querySelector('.app-manage-shops__shop-main') as HTMLElement;
    row.click();
    expect(bottomSheet.open).toHaveBeenCalled();
  });

  it('dispatches setShopOrderRequested on drop', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.onShopDrop({
      previousIndex: 0,
      currentIndex: 1,
      item: { data: undefined },
    } as never);
    expect(dispatchSpy).toHaveBeenCalledWith(
      shopsApiActions.setShopOrderRequested({
        orderedIds: ['s2' as ShopId, 's1' as ShopId],
      }),
    );
  });
});
