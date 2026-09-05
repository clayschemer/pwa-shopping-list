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
import type { CategoryGroupId, ShopId } from '../../../models/ids.model';

/**
 * How much of a group is available at a shop. `some` exists because a group's
 * categories can be individually excluded — the checkbox renders indeterminate
 * rather than lying in either direction.
 */
export type ShopGroupAvailability = 'all' | 'some' | 'none';

export type CategoryGroupEditSheetData =
  | { mode: 'create'; existingNames: string[] }
  | {
      mode: 'edit';
      groupId: CategoryGroupId;
      currentName: string;
      existingNames: string[];
      memberCount: number;
      shops: { id: ShopId; name: string; state: ShopGroupAvailability }[];
    };

export type CategoryGroupEditSheetResult =
  | { kind: 'create'; name: string }
  | {
      kind: 'edit-save';
      name: string;
      addedShops: ShopId[];
      removedShops: ShopId[];
    }
  | { kind: 'delete' };

@Component({
  selector: 'app-category-group-edit-sheet',
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
  templateUrl: './category-group-edit-sheet.component.html',
  styleUrl: './category-group-edit-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryGroupEditSheetComponent {
  private readonly sheetRef = inject(
    MatBottomSheetRef<CategoryGroupEditSheetComponent, CategoryGroupEditSheetResult>,
  );
  readonly data = inject<CategoryGroupEditSheetData>(MAT_BOTTOM_SHEET_DATA);

  readonly mode = this.data.mode;
  readonly memberCount = this.data.mode === 'edit' ? this.data.memberCount : 0;
  readonly name = signal(this.data.mode === 'edit' ? this.data.currentName : '');

  private readonly initialShopStates = new Map<ShopId, ShopGroupAvailability>(
    this.data.mode === 'edit' ? this.data.shops.map((s) => [s.id, s.state]) : [],
  );
  private readonly shopStates = signal(new Map(this.initialShopStates));

  readonly shopRows = computed(() => {
    if (this.data.mode !== 'edit') return [];
    const state = this.shopStates();
    return this.data.shops.map((s) => ({
      id: s.id,
      name: s.name,
      state: state.get(s.id) ?? 'none',
    }));
  });

  private readonly existingNames = this.data.existingNames.map((n) => n.toLowerCase());

  readonly hasConflict = computed(() => {
    const trimmed = this.name().trim().toLowerCase();
    if (!trimmed) return false;
    if (this.data.mode === 'edit' && trimmed === this.data.currentName.toLowerCase()) {
      return false;
    }
    return this.existingNames.includes(trimmed);
  });

  readonly isValid = computed(
    () => this.name().trim().length > 0 && !this.hasConflict(),
  );

  onCancel(): void {
    this.sheetRef.dismiss();
  }

  /**
   * Derives the next state from our own tri-state rather than from the DOM
   * event, so a click on an indeterminate box means "make it all" regardless of
   * how Material resolves `checked` in that case.
   */
  toggleShop(shopId: ShopId): void {
    const next = new Map(this.shopStates());
    next.set(shopId, next.get(shopId) === 'all' ? 'none' : 'all');
    this.shopStates.set(next);
  }

  onSave(): void {
    if (!this.isValid()) return;
    if (this.data.mode === 'create') {
      this.sheetRef.dismiss({ kind: 'create', name: this.name().trim() });
      return;
    }
    const addedShops: ShopId[] = [];
    const removedShops: ShopId[] = [];
    for (const [id, state] of this.shopStates()) {
      const initial = this.initialShopStates.get(id);
      if (state === initial) continue;
      if (state === 'all') addedShops.push(id);
      if (state === 'none') removedShops.push(id);
    }
    this.sheetRef.dismiss({
      kind: 'edit-save',
      name: this.name().trim(),
      addedShops,
      removedShops,
    });
  }

  onDelete(): void {
    this.sheetRef.dismiss({ kind: 'delete' });
  }
}
