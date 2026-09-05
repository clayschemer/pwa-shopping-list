import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Category } from '../../models/category.model';
import type { CategoryId } from '../../models/ids.model';
import { getSelectableUnits } from './item-units';
import { ThemeService } from '../../core/theme/theme.service';

export interface ItemSheetData {
  mode: 'add' | 'edit';
  currentName: string;
  currentDescription: string | null;
  currentQuantity: number | null;
  currentUnit: string | null;
  currentPrimaryCategoryId: CategoryId | null;
  currentSecondaryCategoryIds: CategoryId[];
  currentSizePerPieceQuantity: number | null;
  currentSizePerPieceUnit: string | null;
  existingNames: string[];
  categories: Category[];
}

export interface ItemSheetResult {
  name: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
  secondaryCategoryIds: CategoryId[];
  sizePerPieceQuantity: number | null;
  sizePerPieceUnit: string | null;
}

export type CategorySortMode = 'shop' | 'alphabetical';

@Component({
  selector: 'app-item-sheet',
  imports: [
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatChipListbox,
    MatChipOption,
    MatButton,
    MatIcon,
    TranslocoPipe,
  ],
  templateUrl: './item-sheet.component.html',
  styleUrl: './item-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemSheetComponent {
  private readonly sheetRef = inject(MatBottomSheetRef<ItemSheetComponent>);
  private readonly data = inject<ItemSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly theme = inject(ThemeService);

  readonly mode = this.data.mode;
  readonly categories = this.data.categories;
  readonly units = computed(() => getSelectableUnits(this.theme.settings().language));
  // Bridges pcs <-> mass/volume; count units would never make sense here.
  readonly sizePerPieceUnits = ['g', 'kg', 'ml', 'cl', 'dl', 'L'] as const;

  readonly sortMode = signal<CategorySortMode>('shop');

  readonly sortedCategories = computed<Category[]>(() => {
    if (this.sortMode() === 'alphabetical') {
      return [...this.categories].sort((a, b) => a.name.localeCompare(b.name));
    }
    return this.categories;
  });

  readonly name = signal(this.data.currentName);
  readonly description = signal(this.data.currentDescription ?? '');
  readonly quantity = signal<number | null>(this.data.currentQuantity);
  readonly unit = signal<string | null>(this.data.currentUnit);
  readonly sizePerPieceQuantity = signal<number | null>(
    this.data.currentSizePerPieceQuantity,
  );
  readonly sizePerPieceUnit = signal<string | null>(
    this.data.currentSizePerPieceUnit,
  );
  readonly primaryCategoryId = signal<CategoryId | null>(
    this.data.currentPrimaryCategoryId,
  );
  readonly secondaryCategoryIds = signal<CategoryId[]>([
    ...this.data.currentSecondaryCategoryIds,
  ]);
  readonly secondaryExpanded = signal(
    this.data.currentSecondaryCategoryIds.length > 0,
  );

  private readonly existingNames = this.data.existingNames.map((n) =>
    n.toLowerCase(),
  );

  readonly secondaryCategoryOptions = computed(() =>
    this.sortedCategories().filter((c) => c.id !== this.primaryCategoryId()),
  );

  readonly secondarySelectedCount = computed(() =>
    this.secondaryCategoryIds().length,
  );

  readonly hasConflict = computed(() => {
    const trimmed = this.name().trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    if (
      this.mode === 'edit' &&
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
    this.mode === 'add' ? 'itemSheet.add' : 'itemSheet.save';

  toggleSecondary(): void {
    this.secondaryExpanded.update((v) => !v);
  }

  onPrimaryCategoryChange(id: CategoryId | null): void {
    this.primaryCategoryId.set(id);
    // Drop any secondary that matches the new primary
    if (id) {
      this.secondaryCategoryIds.update((ids) =>
        ids.filter((existing) => existing !== id),
      );
    }
  }

  onSecondarySelectionChange(ids: CategoryId[]): void {
    this.secondaryCategoryIds.set(ids);
  }

  onCancel(): void {
    this.sheetRef.dismiss();
  }

  onSubmit(): void {
    if (!this.isValid()) {
      return;
    }
    const descTrimmed = this.description().trim();
    // Both halves of the tuple must be present, otherwise the field is meaningless.
    const sppQty = this.sizePerPieceQuantity();
    const sppUnit = this.sizePerPieceUnit();
    const sppBothSet = sppQty !== null && sppQty > 0 && !!sppUnit;
    this.sheetRef.dismiss({
      name: this.name().trim(),
      description: descTrimmed.length > 0 ? descTrimmed : null,
      quantity: this.quantity() ?? null,
      unit: this.unit() ?? null,
      primaryCategoryId: this.primaryCategoryId(),
      secondaryCategoryIds: this.secondaryCategoryIds(),
      sizePerPieceQuantity: sppBothSet ? sppQty : null,
      sizePerPieceUnit: sppBothSet ? sppUnit : null,
    } satisfies ItemSheetResult);
  }
}
