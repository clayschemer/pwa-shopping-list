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

export interface DeleteCategoryData {
  name: string;
}

@Component({
  selector: 'app-delete-category-dialog',
  imports: [
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    TranslocoPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'deleteCategory.title' | transloco }}</h2>
    <mat-dialog-content>
      {{ 'deleteCategory.message' | transloco: { name: data.name } }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        {{ 'deleteCategory.cancel' | transloco }}
      </button>
      <button mat-button color="warn" [mat-dialog-close]="true">
        {{ 'deleteCategory.delete' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCategoryDialogComponent {
  readonly data = inject<DeleteCategoryData>(MAT_DIALOG_DATA);
}
