import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import {
  UndoHistorySheetComponent,
  type UndoHistoryData,
} from './undo-history-sheet.component';
import type { Item } from '../../models/item.model';
import type { User } from '../../models/user.model';
import type { SessionCheckedItem } from '../../models/session.model';
import type {
  AccountId,
  ItemId,
  UserId,
} from '../../models/ids.model';

const user = (id: string, displayName: string): User => ({
  id: id as UserId,
  accountId: 'a1' as AccountId,
  email: `${id}@example.com`,
  displayName,
});

const checked = (
  itemId: string,
  overrides: Partial<SessionCheckedItem> = {},
): SessionCheckedItem => ({
  itemId: itemId as ItemId,
  checkedBy: 'u1' as UserId,
  checkedAt: 1,
  priceSnapshot: null,
  priceQuantitySnapshot: null,
  priceUnitSnapshot: null,
  nameSnapshot: null,
  quantitySnapshot: null,
  unitSnapshot: null,
  ...overrides,
});

function setupSheet(data: UndoHistoryData): ComponentFixture<UndoHistorySheetComponent> {
  TestBed.configureTestingModule({
    imports: [UndoHistorySheetComponent, provideTranslocoTesting()],
    providers: [
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
      { provide: MatBottomSheetRef, useValue: { dismiss: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(UndoHistorySheetComponent);
  fixture.detectChanges();
  return fixture;
}

describe('UndoHistorySheetComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows the snapshotted item name when the item is missing from the entity store', () => {
    const fixture = setupSheet({
      checkedItems: [checked('i1', { nameSnapshot: 'Milk' })],
      itemsById: {} as Record<ItemId, Item>,
      usersById: { ['u1' as UserId]: user('u1', 'Alice') },
    });
    const el: HTMLElement = fixture.nativeElement;
    const name = el.querySelector('.undo-history-sheet__name')?.textContent?.trim();
    expect(name).toBe('Milk');
    expect(name).not.toBe('—');
  });

  it('prefers the snapshotted name even if the item was renamed after checking', () => {
    const fixture = setupSheet({
      checkedItems: [checked('i1', { nameSnapshot: 'Apples' })],
      itemsById: {
        ['i1' as ItemId]: {
          id: 'i1' as ItemId,
          accountId: 'a1' as AccountId,
          name: 'Green Apples',
          description: null,
          quantity: null,
          unit: null,
          primaryCategoryId: null,
          secondaryCategoryIds: [],
          removed: true,
          removedAt: 1,
          addedBy: 'user',
          aiMotivation: null,
          price: null,
          priceQuantity: null,
          priceUnit: null,
          priceUpdatedAt: null,
          purchaseCount: 0,
        },
      } as Record<ItemId, Item>,
      usersById: { ['u1' as UserId]: user('u1', 'Alice') },
    });
    const el: HTMLElement = fixture.nativeElement;
    const name = el.querySelector('.undo-history-sheet__name')?.textContent?.trim();
    expect(name).toBe('Apples');
  });
});
