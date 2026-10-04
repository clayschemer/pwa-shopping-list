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

export interface DeleteCategoryGroupData {
  name: string;
}

@Component({
  selector: 'app-delete-category-group-dialog',
  imports: [
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    TranslocoPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'deleteCategoryGroup.title' | transloco }}</h2>
    <mat-dialog-content>
      {{ 'deleteCategoryGroup.message' | transloco: { name: data.name } }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        {{ 'deleteCategoryGroup.cancel' | transloco }}
      </button>
      <button mat-button color="warn" [mat-dialog-close]="true">
        {{ 'deleteCategoryGroup.delete' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCategoryGroupDialogComponent {
  readonly data = inject<DeleteCategoryGroupData>(MAT_DIALOG_DATA);
}
