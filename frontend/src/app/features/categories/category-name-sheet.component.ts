import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export interface CategoryNameSheetData {
  mode: 'add' | 'rename';
  currentName: string;
  existingNames: string[];
}

export interface CategoryNameSheetResult {
  name: string;
}

@Component({
  selector: 'app-category-name-sheet',
  imports: [
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    TranslocoPipe,
  ],
  templateUrl: './category-name-sheet.component.html',
  styleUrl: './category-name-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryNameSheetComponent {
  private readonly sheetRef = inject(MatBottomSheetRef<CategoryNameSheetComponent>);
  private readonly data = inject<CategoryNameSheetData>(MAT_BOTTOM_SHEET_DATA);

  readonly mode = this.data.mode;
  readonly name = signal(this.data.currentName);

  private readonly existingNames = this.data.existingNames.map((n) =>
    n.toLowerCase(),
  );

  readonly hasConflict = computed(() => {
    const trimmed = this.name().trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    if (
      this.mode === 'rename' &&
      trimmed === this.data.currentName.toLowerCase()
    ) {
      return false;
    }
    return this.existingNames.includes(trimmed);
  });

  readonly isValid = computed(() => {
    const trimmed = this.name().trim();
    return trimmed.length > 0 && !this.hasConflict();
  });

  readonly actionLabel =
    this.mode === 'add' ? 'categoryNameSheet.add' : 'categoryNameSheet.save';

  onCancel(): void {
    this.sheetRef.dismiss();
  }

  onSubmit(): void {
    if (this.isValid()) {
      this.sheetRef.dismiss({
        name: this.name().trim(),
      } satisfies CategoryNameSheetResult);
    }
  }
}
