import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export interface DeleteStoreData {
  name: string;
}

@Component({
  selector: 'app-delete-store-dialog',
  imports: [
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    TranslocoPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'deleteStore.title' | transloco }}</h2>
    <mat-dialog-content>
      {{ 'deleteStore.message' | transloco: { name: data.name } }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        {{ 'deleteStore.cancel' | transloco }}
      </button>
      <button mat-button color="warn" [mat-dialog-close]="true">
        {{ 'deleteStore.delete' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteStoreDialogComponent {
  readonly data = inject<DeleteStoreData>(MAT_DIALOG_DATA);
}
