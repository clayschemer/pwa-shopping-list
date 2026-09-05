import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CategoryGroup } from '../../../models/category-group.model';
import type { CategoryGroupId } from '../../../models/ids.model';

export interface GroupPickerSheetData {
  mode: 'add' | 'remove';
  groups: CategoryGroup[];
}

/** The chosen group, or `undefined` when the sheet is dismissed. */
export type GroupPickerSheetResult = CategoryGroupId | undefined;

@Component({
  selector: 'app-group-picker-sheet',
  imports: [MatButton, TranslocoPipe],
  templateUrl: './group-picker-sheet.component.html',
  styleUrl: './group-picker-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupPickerSheetComponent {
  private readonly sheetRef = inject(
    MatBottomSheetRef<GroupPickerSheetComponent, GroupPickerSheetResult>,
  );
  readonly data = inject<GroupPickerSheetData>(MAT_BOTTOM_SHEET_DATA);

  onPick(groupId: CategoryGroupId): void {
    this.sheetRef.dismiss(groupId);
  }

  onCancel(): void {
    this.sheetRef.dismiss();
  }
}
