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
import { MatCheckbox } from '@angular/material/checkbox';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CategoryId, ShopId } from '../../../models/ids.model';

export type CategoryEditSheetData =
  | {
      mode: 'create';
      existingNames: string[];
    }
  | {
      mode: 'edit';
      categoryId: CategoryId;
      currentName: string;
      currentColor: string | null;
      existingNames: string[];
      shops: { id: ShopId; name: string; includes: boolean }[];
    };

export type CategoryEditSheetResult =
  | { kind: 'create'; name: string; color: string | null }
  | {
      kind: 'edit-save';
      name: string;
      color: string | null;
      addedShops: ShopId[];
      removedShops: ShopId[];
    }
  | { kind: 'delete' };

@Component({
  selector: 'app-category-edit-sheet',
  imports: [
    FormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    MatCheckbox,
    TranslocoPipe,
  ],
  templateUrl: './category-edit-sheet.component.html',
  styleUrl: './category-edit-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryEditSheetComponent {
  private readonly sheetRef = inject(
    MatBottomSheetRef<CategoryEditSheetComponent, CategoryEditSheetResult>,
  );
  readonly data = inject<CategoryEditSheetData>(MAT_BOTTOM_SHEET_DATA);

  readonly mode = this.data.mode;
  readonly name = signal(this.data.mode === 'edit' ? this.data.currentName : '');
  readonly color = signal<string | null>(
    this.data.mode === 'edit' ? this.data.currentColor : null,
  );
  readonly hasColor = computed(() => this.color() !== null);

  private readonly initialShopIncludes = new Map<ShopId, boolean>(
    this.data.mode === 'edit'
      ? this.data.shops.map((s) => [s.id, s.includes])
      : [],
  );
  private readonly shopIncludes = signal(new Map(this.initialShopIncludes));

  readonly shopRows = computed(() => {
    if (this.data.mode !== 'edit') return [];
    const state = this.shopIncludes();
    return this.data.shops.map((s) => ({
      id: s.id,
      name: s.name,
      includes: state.get(s.id) ?? false,
    }));
  });

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

  onColorInput(event: Event): void {
    this.color.set((event.target as HTMLInputElement).value);
  }

  onClearColor(): void {
    this.color.set(null);
  }

  toggleShop(shopId: ShopId, checked: boolean): void {
    const next = new Map(this.shopIncludes());
    next.set(shopId, checked);
    this.shopIncludes.set(next);
  }

  onSave(): void {
    if (!this.isValid()) return;
    if (this.data.mode === 'create') {
      this.sheetRef.dismiss({
        kind: 'create',
        name: this.name().trim(),
        color: this.color(),
      });
      return;
    }
    const added: ShopId[] = [];
    const removed: ShopId[] = [];
    for (const [id, includes] of this.shopIncludes()) {
      if (includes && !this.initialShopIncludes.get(id)) added.push(id);
      if (!includes && this.initialShopIncludes.get(id)) removed.push(id);
    }
    this.sheetRef.dismiss({
      kind: 'edit-save',
      name: this.name().trim(),
      color: this.color(),
      addedShops: added,
      removedShops: removed,
    });
  }

  onDelete(): void {
    this.sheetRef.dismiss({ kind: 'delete' });
  }
}
