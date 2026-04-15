import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EMPTY } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideRouter } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ManageShopsComponent } from './manage-shops.component';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { categoriesReducer } from '../../store/categories/categories.reducer';
import { shopsActions } from '../../store/shops/shops.actions';
import type { Shop } from '../../models/shop.model';
import type { AccountId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [],
});

describe('ManageShopsComponent', () => {
  let fixture: ComponentFixture<ManageShopsComponent>;
  let component: ManageShopsComponent;
  let store: Store;
  let bottomSheet: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    bottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => EMPTY }) };

    await TestBed.configureTestingModule({
      imports: [ManageShopsComponent],
      providers: [
        provideRouter([]),
        provideStore({
          shops: shopsReducer,
          ui: uiReducer,
          categories: categoriesReducer,
        }),
        { provide: MatBottomSheet, useValue: bottomSheet },
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    store.dispatch(shopsActions.shopsLoaded({
      shops: [shop('s1', 'Tesco'), shop('s2', 'Lidl')],
    }));

    fixture = TestBed.createComponent(ManageShopsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a list of shops', () => {
    const el: HTMLElement = fixture.nativeElement;
    const shopNames = Array.from(el.querySelectorAll('.app-manage-shops__shop-name'))
      .map((e) => e.textContent?.trim());
    expect(shopNames).toEqual(['Tesco', 'Lidl']);
  });

  it('renders a back button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const backBtn = el.querySelector('.app-manage-shops__back-btn');
    expect(backBtn).toBeTruthy();
  });

  it('renders an add shop FAB', () => {
    const el: HTMLElement = fixture.nativeElement;
    const fab = el.querySelector('.app-manage-shops__fab');
    expect(fab).toBeTruthy();
  });

  it('renders delete buttons for each shop', () => {
    const el: HTMLElement = fixture.nativeElement;
    const deleteBtns = el.querySelectorAll('.app-manage-shops__delete-btn');
    expect(deleteBtns.length).toBe(2);
  });

  it('opens bottom sheet when FAB is clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const fab = el.querySelector('.app-manage-shops__fab') as HTMLElement;
    fab.click();
    expect(bottomSheet.open).toHaveBeenCalled();
  });

  it('opens bottom sheet when shop name is clicked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const shopName = el.querySelector('.app-manage-shops__shop-name') as HTMLElement;
    shopName.click();
    expect(bottomSheet.open).toHaveBeenCalled();
  });
});
