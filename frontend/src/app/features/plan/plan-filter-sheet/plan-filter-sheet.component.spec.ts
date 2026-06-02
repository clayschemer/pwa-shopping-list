import '../../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing';
import { PlanFilterSheetComponent } from './plan-filter-sheet.component';

describe('PlanFilterSheetComponent', () => {
  let fixture: ComponentFixture<PlanFilterSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanFilterSheetComponent, provideTranslocoTesting()],
      providers: [
        { provide: MatBottomSheetRef, useValue: { dismiss: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanFilterSheetComponent);
    fixture.detectChanges();
  });

  it('renders the sheet title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-plan-filter-sheet__title')?.textContent?.trim()).toBeTruthy();
  });

  it('renders placeholder content until the toggles ship', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.app-plan-filter-sheet__placeholder')).toBeTruthy();
  });
});
