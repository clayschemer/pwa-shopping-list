import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectOrderedShops } from '../../store/selectors/ordered-shops.selectors';
import { selectSelectedShopId } from '../../store/ui/ui.selectors';
import { uiActions } from '../../store/ui/ui.actions';
import {
  ShopPickerDialogComponent,
  ShopPickerData,
  ShopPickerResult,
} from '../../features/shop/shop-picker-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-nav-drawer',
  imports: [MatButton, MatDivider, MatIcon, TranslocoPipe],
  templateUrl: './nav-drawer.component.html',
  styleUrl: './nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavDrawerComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);

  readonly shops = toSignal(this.store.select(selectOrderedShops), { initialValue: [] });
  readonly selectedShopId = toSignal(this.store.select(selectSelectedShopId), { initialValue: null });

  readonly selectedShopName = computed<string | null>(() => {
    const id = this.selectedShopId();
    if (!id) return null;
    return this.shops().find((s) => s.id === id)?.name ?? null;
  });

  readonly viewCategories = output<void>();
  readonly manageShops = output<void>();
  readonly viewHistory = output<void>();
  readonly viewSettings = output<void>();

  openShopPicker(): void {
    const ref = this.dialog.open<ShopPickerDialogComponent, ShopPickerData, ShopPickerResult>(
      ShopPickerDialogComponent,
      { data: { shops: this.shops(), selectedShopId: this.selectedShopId() } },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.store.dispatch(uiActions.planModeShopSelected({ shopId: result }));
    });
  }

  onViewCategories(): void {
    this.viewCategories.emit();
  }

  onManageShops(): void {
    this.manageShops.emit();
  }

  onViewHistory(): void {
    this.viewHistory.emit();
  }

  onViewSettings(): void {
    this.viewSettings.emit();
  }
}
