import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export interface ConfirmRemoveItemData {
  name: string;
}

@Component({
  selector: 'app-confirm-remove-item-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    TranslocoPipe,
  ],
  templateUrl: './confirm-remove-item-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmRemoveItemDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<ConfirmRemoveItemDialogComponent, boolean>,
  );
  readonly data = inject<ConfirmRemoveItemData>(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
