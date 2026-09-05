import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Shop } from '../../models/shop.model';
import type { ShopId } from '../../models/ids.model';

export interface ShopSelectData {
  shops: Shop[];
  activeSessionShopIds: Set<ShopId | null>;
}

export type ShopSelectResult = { shopId: ShopId | null };

@Component({
  selector: 'app-shop-select-sheet',
  imports: [MatIcon, TranslocoPipe],
  templateUrl: './shop-select-sheet.component.html',
  styleUrl: './shop-select-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopSelectSheetComponent {
  private readonly ref = inject<MatBottomSheetRef<ShopSelectSheetComponent, ShopSelectResult>>(
    MatBottomSheetRef,
  );
  readonly data = inject<ShopSelectData>(MAT_BOTTOM_SHEET_DATA);

  hasActiveSession(shopId: ShopId | null): boolean {
    return this.data.activeSessionShopIds.has(shopId);
  }

  choose(shopId: ShopId | null): void {
    this.ref.dismiss({ shopId });
  }
}
