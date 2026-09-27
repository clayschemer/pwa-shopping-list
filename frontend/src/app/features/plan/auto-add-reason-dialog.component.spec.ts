import '../../../testing/init-testbed';
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import {
  AutoAddReasonDialogComponent,
  type AutoAddReasonDialogData,
} from './auto-add-reason-dialog.component';
import type { AutoAddReason } from '../../models/item.model';

const PERIODICITY: AutoAddReason = {
  kind: 'periodicity',
  medianIntervalDays: 7,
  daysSinceLastPurchase: 9,
  purchaseCount: 5,
};

describe('AutoAddReasonDialogComponent', () => {
  const dialogRef = { close: vi.fn() };

  function setup(data: AutoAddReasonDialogData) {
    dialogRef.close.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AutoAddReasonDialogComponent, provideTranslocoTesting()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    const fixture = TestBed.createComponent(AutoAddReasonDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('names the item the reason is about', () => {
    const fixture = setup({
      itemName: 'Milk',
      reason: PERIODICITY,
      motivation: null,
    });

    expect(fixture.nativeElement.textContent).toContain('Milk');
  });

  /**
   * The rule-driven sentence goes through transloco with the median interval
   * interpolated, so it reads in the user's language rather than being composed
   * in TypeScript.
   */
  it('renders the periodicity reason with the interval interpolated', () => {
    const fixture = setup({
      itemName: 'Milk',
      reason: PERIODICITY,
      motivation: null,
    });

    const reason = fixture.nativeElement.querySelector(
      '.app-auto-add-dialog__reason',
    );
    expect(reason?.textContent).toContain('7');
  });

  it('reflects a different interval', () => {
    const fixture = setup({
      itemName: 'Coffee',
      reason: { ...PERIODICITY, medianIntervalDays: 21 },
      motivation: null,
    });

    const reason = fixture.nativeElement.querySelector(
      '.app-auto-add-dialog__reason',
    );
    expect(reason?.textContent).toContain('21');
    expect(reason?.textContent).not.toContain('7 ');
  });

  /**
   * Model-authored prose is stored in one language and shown as written — the
   * single exemption from translating everything user-visible. When present it
   * replaces the generated sentence rather than appearing alongside it.
   */
  it('shows stored prose verbatim in place of the generated sentence', () => {
    const fixture = setup({
      itemName: 'Basil',
      reason: PERIODICITY,
      motivation: 'Du behöver basilika till pastarecepten den här veckan.',
    });

    const reasons = fixture.nativeElement.querySelectorAll(
      '.app-auto-add-dialog__reason',
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0].textContent).toContain(
      'Du behöver basilika till pastarecepten den här veckan.',
    );
  });

  it('closes on the close action', () => {
    const fixture = setup({
      itemName: 'Milk',
      reason: PERIODICITY,
      motivation: null,
    });

    const buttons = [...fixture.nativeElement.querySelectorAll('button')];
    buttons[buttons.length - 1].click();

    expect(dialogRef.close).toHaveBeenCalledOnce();
  });
});
