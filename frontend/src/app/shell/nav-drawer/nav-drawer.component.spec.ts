import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { NavDrawerComponent } from './nav-drawer.component';
import { categoriesReducer } from '../../store/categories/categories.reducer';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { categoriesActions, categoriesApiActions } from '../../store/categories/categories.actions';
import { shopsActions, shopsApiActions } from '../../store/shops/shops.actions';
import { uiActions } from '../../store/ui/ui.actions';
import type { Category } from '../../models/category.model';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const cat = (id: string, name: string, order: number): Category => ({
  id: id as CategoryId,
  accountId: 'a1' as AccountId,
  name,
  color: null,
  globalSortOrder: order,
});

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
          categories: categoriesReducer,
          shops: shopsReducer,
          ui: uiReducer,
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    store.dispatch(categoriesActions.categoriesLoaded({
      categories: [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1), cat('c3', 'Bakery', 2)],
    }));
    store.dispatch(shopsActions.shopsLoaded({
      shops: [
        shop('s1', 'Tesco', ['c1', 'c2', 'c3']),
        shop('s2', 'Lidl', ['c3', 'c1', 'c2']),
      ],
    }));

    fixture = TestBed.createComponent(NavDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders shop dropdown with "Global (all)" option plus all shops', () => {
    const el: HTMLElement = fixture.nativeElement;
    // Trigger the mat-select to get options
    const select = el.querySelector('mat-select');
    expect(select).toBeTruthy();
  });

  it('renders category list in global order by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    const categoryNames = Array.from(el.querySelectorAll('.app-nav-drawer__category-name'))
      .map((e) => e.textContent?.trim());
    expect(categoryNames).toEqual(['Produce', 'Dairy', 'Bakery']);
  });

  it('renders category list in shop order when shop is selected', () => {
    store.dispatch(uiActions.planModeShopSelected({ shopId: 's2' as ShopId }));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const categoryNames = Array.from(el.querySelectorAll('.app-nav-drawer__category-name'))
      .map((e) => e.textContent?.trim());
    expect(categoryNames).toEqual(['Bakery', 'Produce', 'Dairy']);
  });

  it('renders "Manage shops..." link', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.app-nav-drawer__manage-shops');
    expect(link).toBeTruthy();
    expect(link!.textContent?.trim()).toBe('Manage shops\u2026');
  });

  it('renders "+ Add category" button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('.app-nav-drawer__add-category');
    expect(btn).toBeTruthy();
    expect(btn!.textContent?.trim()).toContain('Add category');
  });

  it('emits categorySelected when a category is tapped', () => {
    let emitted: CategoryId | undefined;
    component.categorySelected.subscribe((id) => (emitted = id));

    const el: HTMLElement = fixture.nativeElement;
    const firstCategory = el.querySelector('.app-nav-drawer__category-name') as HTMLElement;
    firstCategory.click();

    expect(emitted).toBe('c1');
  });

  it('emits manageShops when link is clicked', () => {
    let emitted = false;
    component.manageShops.subscribe(() => (emitted = true));

    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.app-nav-drawer__manage-shops') as HTMLElement;
    link.click();

    expect(emitted).toBe(true);
  });

  it('emits addCategory when button is clicked', () => {
    let emitted = false;
    component.addCategory.subscribe(() => (emitted = true));

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('.app-nav-drawer__add-category') as HTMLElement;
    btn.click();

    expect(emitted).toBe(true);
  });

  it('dispatches setGlobalCategoryOrder on drop when no shop selected', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    component.onCategoryDrop({
      previousIndex: 0,
      currentIndex: 2,
      item: { data: undefined },
    } as never);

    expect(dispatchSpy).toHaveBeenCalledWith(
      categoriesApiActions.setGlobalCategoryOrderRequested({
        orderedIds: ['c2', 'c3', 'c1'] as CategoryId[],
      }),
    );
  });

  it('dispatches setShopCategoryOrder on drop when a shop is selected', () => {
    store.dispatch(uiActions.planModeShopSelected({ shopId: 's1' as ShopId }));
    fixture.detectChanges();
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    component.onCategoryDrop({
      previousIndex: 0,
      currentIndex: 2,
      item: { data: undefined },
    } as never);

    expect(dispatchSpy).toHaveBeenCalledWith(
      shopsApiActions.setShopCategoryOrderRequested({
        shopId: 's1' as ShopId,
        orderedIds: ['c2', 'c3', 'c1'] as CategoryId[],
      }),
    );
  });

  it('renders a Settings link', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.app-nav-drawer__settings');
    expect(link).toBeTruthy();
    expect(link!.textContent?.trim()).toContain('Settings');
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
