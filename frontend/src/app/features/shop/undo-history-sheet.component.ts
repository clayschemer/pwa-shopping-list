import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoneyPipe } from '../../core/format/money.pipe';
import type { Item } from '../../models/item.model';
import type { User } from '../../models/user.model';
import type { SessionCheckedItem } from '../../models/session.model';
import type { ItemId, UserId } from '../../models/ids.model';

export interface UndoHistoryData {
  checkedItems: SessionCheckedItem[];
  itemsById: Record<ItemId, Item>;
  usersById: Record<UserId, User>;
}

export interface UndoHistoryEntry {
  itemId: ItemId;
  itemName: string;
  price: number | null;
  userInitials: string;
  checkedAt: number;
}

@Component({
  selector: 'app-undo-history-sheet',
  imports: [TranslocoPipe, MoneyPipe],
  templateUrl: './undo-history-sheet.component.html',
  styleUrl: './undo-history-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UndoHistorySheetComponent {
  private readonly ref = inject<MatBottomSheetRef<UndoHistorySheetComponent, ItemId>>(
    MatBottomSheetRef,
  );
  readonly data = inject<UndoHistoryData>(MAT_BOTTOM_SHEET_DATA);

  readonly entries = computed<UndoHistoryEntry[]>(() =>
    [...this.data.checkedItems]
      .sort((a, b) => b.checkedAt - a.checkedAt)
      .map((c) => {
        const item = this.data.itemsById[c.itemId];
        const user = this.data.usersById[c.checkedBy];
        return {
          itemId: c.itemId,
          itemName: item?.name ?? '—',
          price: c.priceSnapshot,
          userInitials: initialsOf(user?.displayName ?? user?.email ?? '?'),
          checkedAt: c.checkedAt,
        };
      }),
  );

  uncheck(itemId: ItemId): void {
    this.ref.dismiss(itemId);
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
