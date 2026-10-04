import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export type StoreEditSheetData =
  | { mode: 'create'; existingNames: string[] }
  | {
      mode: 'edit';
      currentName: string;
      currentPriceSearchUrl: string | null;
      existingNames: string[];
    };

export type StoreEditSheetResult =
  | { kind: 'create'; name: string; priceSearchUrl: string | null }
  | {
      kind: 'edit-save';
      name: string;
      priceSearchUrl: string | null;
      nameChanged: boolean;
      priceSearchUrlChanged: boolean;
    }
  | { kind: 'delete' };

@Component({
  selector: 'app-store-edit-sheet',
  imports: [
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatButton,
    TranslocoPipe,
  ],
  templateUrl: './store-edit-sheet.component.html',
  styleUrl: './store-edit-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreEditSheetComponent {
  private readonly sheetRef = inject(
    MatBottomSheetRef<StoreEditSheetComponent, StoreEditSheetResult>,
  );
  readonly data = inject<StoreEditSheetData>(MAT_BOTTOM_SHEET_DATA);

  readonly mode = this.data.mode;
  readonly name = signal(this.data.mode === 'edit' ? this.data.currentName : '');
  readonly priceSearchUrl = signal<string>(
    this.data.mode === 'edit' ? (this.data.currentPriceSearchUrl ?? '') : '',
  );

  private readonly existingNames = this.data.existingNames.map((n) =>
    n.toLowerCase(),
  );

  readonly hasConflict = computed(() => {
    const trimmed = this.name().trim().toLowerCase();
    if (!trimmed) return false;
    if (
      this.data.mode === 'edit' &&
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

  onCancel(): void {
    this.sheetRef.dismiss();
  }

  onSave(): void {
    if (!this.isValid()) return;
    const trimmedUrl = this.priceSearchUrl().trim();
    const nextUrl = trimmedUrl.length > 0 ? trimmedUrl : null;
    const trimmedName = this.name().trim();
    if (this.data.mode === 'create') {
      this.sheetRef.dismiss({
        kind: 'create',
        name: trimmedName,
        priceSearchUrl: nextUrl,
      });
      return;
    }
    this.sheetRef.dismiss({
      kind: 'edit-save',
      name: trimmedName,
      priceSearchUrl: nextUrl,
      nameChanged: trimmedName !== this.data.currentName,
      priceSearchUrlChanged:
        nextUrl !== (this.data.currentPriceSearchUrl ?? null),
    });
  }

  onDelete(): void {
    this.sheetRef.dismiss({ kind: 'delete' });
  }
}
