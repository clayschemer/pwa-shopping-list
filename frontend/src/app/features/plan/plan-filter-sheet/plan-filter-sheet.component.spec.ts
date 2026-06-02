import '../../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideStore, Store } from '@ngrx/store';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing';
import { PlanFilterSheetComponent } from './plan-filter-sheet.component';
import { ThemeService } from '../../../core/theme/theme.service';
import { uiReducer } from '../../../store/ui/ui.reducer';
import { uiActions } from '../../../store/ui/ui.actions';
import type { ShopId } from '../../../models/ids.model';

describe('PlanFilterSheetComponent', () => {
  let fixture: ComponentFixture<PlanFilterSheetComponent>;
  let themeService: ThemeService;
  let store: Store;
  let dismiss: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    dismiss = vi.fn();
    await TestBed.configureTestingModule({
      imports: [PlanFilterSheetComponent, provideTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideStore({ ui: uiReducer }),
        { provide: MatBottomSheetRef, useValue: { dismiss } },
      ],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
    store = TestBed.inject(Store);
    fixture = TestBed.createComponent(PlanFilterSheetComponent);
    fixture.detectChanges();
  });

  it('renders the sheet title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-plan-filter-sheet__title')?.textContent?.trim()).toBeTruthy();
  });

  it('renders three slide toggles plus the reorder action', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('mat-slide-toggle').length).toBe(3);
    expect(el.querySelector('.app-plan-filter-sheet__action')).toBeTruthy();
  });

  it('reflects current ThemeService toggle state', () => {
    themeService.update({ hidePrices: true });
    fixture.detectChanges();
    expect(fixture.componentInstance.hidePrices()).toBe(true);
  });

  it('updates ThemeService when the hide-grouping toggle is changed', () => {
    fixture.componentInstance.toggleHideGrouping(true);
    expect(themeService.settings().hideCategoryGrouping).toBe(true);
  });

  it('updates ThemeService when the show-checked toggle is changed', () => {
    fixture.componentInstance.toggleShowChecked(true);
    expect(themeService.settings().showCheckedItems).toBe(true);
  });

  it('updates ThemeService when the hide-prices toggle is changed', () => {
    fixture.componentInstance.toggleHidePrices(true);
    expect(themeService.settings().hidePrices).toBe(true);
  });

  it('reorder shortcut routes to /categories with layout=global when no shop selected', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.componentInstance.reorderCategories();
    expect(dismiss).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/categories'], {
      queryParams: { layout: 'global' },
    });
  });

  it('reorder shortcut routes with the active shop id when one is selected', async () => {
    store.dispatch(uiActions.planModeShopSelected({ shopId: 's1' as ShopId }));
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.componentInstance.reorderCategories();
    expect(navSpy).toHaveBeenCalledWith(['/categories'], {
      queryParams: { layout: 's1' },
    });
  });
});
