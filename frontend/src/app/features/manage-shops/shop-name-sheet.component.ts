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

export interface ShopNameSheetData {
  mode: 'add' | 'rename';
  currentName: string;
  existingNames: string[];
}

export interface ShopNameSheetResult {
  name: string;
}

@Component({
  selector: 'app-shop-name-sheet',
  imports: [
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    TranslocoPipe,
  ],
  templateUrl: './shop-name-sheet.component.html',
  styleUrl: './shop-name-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopNameSheetComponent {
  private readonly sheetRef = inject(MatBottomSheetRef<ShopNameSheetComponent>);
  private readonly data = inject<ShopNameSheetData>(MAT_BOTTOM_SHEET_DATA);

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
    if (this.mode === 'rename' && trimmed === this.data.currentName.toLowerCase()) {
      return false;
    }
    return this.existingNames.includes(trimmed);
  });

  readonly isValid = computed(() => {
    const trimmed = this.name().trim();
    return trimmed.length > 0 && !this.hasConflict();
  });

  readonly actionLabel = this.mode === 'add' ? 'shopNameSheet.add' : 'shopNameSheet.save';

  onCancel(): void {
    this.sheetRef.dismiss();
  }

  onSubmit(): void {
    if (this.isValid()) {
      this.sheetRef.dismiss({ name: this.name().trim() } satisfies ShopNameSheetResult);
    }
  }
}
