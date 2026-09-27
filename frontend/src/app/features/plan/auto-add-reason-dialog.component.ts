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
import type { AutoAddReason } from '../../models/item.model';

export interface AutoAddReasonDialogData {
  itemName: string;
  reason: AutoAddReason;
  /**
   * Model-authored prose, shown verbatim in place of the translated sentence.
   * Null for rule-driven additions.
   */
  motivation: string | null;
}

/**
 * Explains why the app put an item on the list.
 *
 * The rule-driven case renders one translated sentence built from
 * `reason.kind`, so it reads in the user's language. Model-authored prose, when
 * a future reason carries any, is stored in a single language and shown as
 * written — the one place in the feature where text does not go through
 * transloco.
 */
@Component({
  selector: 'app-auto-add-reason-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    TranslocoPipe,
  ],
  templateUrl: './auto-add-reason-dialog.component.html',
  styleUrl: './auto-add-reason-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoAddReasonDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AutoAddReasonDialogComponent>);
  readonly data = inject<AutoAddReasonDialogData>(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close();
  }
}
