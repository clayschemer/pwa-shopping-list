import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  afterNextRender,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Shop } from '../../models/shop.model';
import type { ShopId } from '../../models/ids.model';
import {
  ShopPickerDialogComponent,
  ShopPickerData,
  ShopPickerResult,
} from '../../features/shop/shop-picker-dialog.component';

@Component({
  selector: 'app-shop-banner',
  imports: [MatIcon, TranslocoPipe],
  templateUrl: './shop-banner.component.html',
  styleUrl: './shop-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.app-shop-banner--entered]': 'entered()',
  },
})
export class ShopBannerComponent {
  private readonly dialog = inject(MatDialog);

  readonly shops = input<Shop[]>([]);
  readonly selectedShopId = input<ShopId | null>(null);
  readonly isShopMode = input(false);

  readonly shopSelected = output<ShopId | null>();
  readonly changeRequested = output<void>();

  // Drives the mount-in transition. CSS @starting-style was tried first but
  // proved unreliable — it depends on the browser committing a distinct
  // first frame before the transition can register, and under Angular's
  // synchronous insertion this sometimes never happens, leaving the element
  // permanently stuck at its "from" values (scaleY(0), opacity: 0) instead of
  // settling at its final state. Toggling a class one frame after render
  // (afterNextRender) guarantees that split deterministically.
  readonly entered = signal(false);

  constructor() {
    afterNextRender(() => this.entered.set(true));
  }

  readonly shopName = computed<string | null>(() => {
    const id = this.selectedShopId();
    if (!id) return null;
    return this.shops().find((s) => s.id === id)?.name ?? null;
  });

  onTriggerClicked(): void {
    if (this.isShopMode()) {
      this.changeRequested.emit();
      return;
    }
    this.openShopPicker();
  }

  private openShopPicker(): void {
    const ref = this.dialog.open<ShopPickerDialogComponent, ShopPickerData, ShopPickerResult>(
      ShopPickerDialogComponent,
      { data: { shops: this.shops(), selectedShopId: this.selectedShopId() } },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.shopSelected.emit(result);
    });
  }
}
