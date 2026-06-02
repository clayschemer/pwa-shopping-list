import '../../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing';
import { PlanFilterSheetComponent } from './plan-filter-sheet.component';
import { ThemeService } from '../../../core/theme/theme.service';

describe('PlanFilterSheetComponent', () => {
  let fixture: ComponentFixture<PlanFilterSheetComponent>;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PlanFilterSheetComponent, provideTranslocoTesting()],
      providers: [
        { provide: MatBottomSheetRef, useValue: { dismiss: () => {} } },
      ],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(PlanFilterSheetComponent);
    fixture.detectChanges();
  });

  it('renders the sheet title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-plan-filter-sheet__title')?.textContent?.trim()).toBeTruthy();
  });

  it('renders three slide toggles', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('mat-slide-toggle').length).toBe(3);
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
});
