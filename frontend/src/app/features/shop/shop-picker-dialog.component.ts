import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Shop } from '../../models/shop.model';
import type { ShopId } from '../../models/ids.model';

export interface ShopPickerData {
  shops: Shop[];
  selectedShopId: ShopId | null;
}

export type ShopPickerResult = ShopId | null;

@Component({
  selector: 'app-shop-picker-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatIcon, TranslocoPipe],
  templateUrl: './shop-picker-dialog.component.html',
  styleUrl: './shop-picker-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPickerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ShopPickerDialogComponent, ShopPickerResult>);
  readonly data = inject<ShopPickerData>(MAT_DIALOG_DATA);

  isSelected(shopId: ShopId | null): boolean {
    return this.data.selectedShopId === shopId;
  }

  choose(shopId: ShopId | null): void {
    this.dialogRef.close(shopId);
  }
}
