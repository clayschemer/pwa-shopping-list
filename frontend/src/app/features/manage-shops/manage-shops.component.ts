import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { shopsApiActions } from '../../store/shops/shops.actions';
import {
  ShopNameSheetComponent,
  ShopNameSheetData,
  ShopNameSheetResult,
} from './shop-name-sheet.component';
import type { Shop } from '../../models/shop.model';
import type { ShopId } from '../../models/ids.model';

@Component({
  selector: 'app-manage-shops',
  imports: [
    MatIconButton,
    MatFabButton,
    MatIcon,
  ],
  templateUrl: './manage-shops.component.html',
  styleUrl: './manage-shops.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageShopsComponent {
  private readonly store = inject(Store);
  private readonly location = inject(Location);
  private readonly bottomSheet = inject(MatBottomSheet);

  readonly shops = toSignal(this.store.select(selectAllShops), { initialValue: [] });

  goBack(): void {
    this.location.back();
  }

  openAddSheet(): void {
    const ref = this.bottomSheet.open(ShopNameSheetComponent, {
      data: {
        mode: 'add',
        currentName: '',
        existingNames: this.shops().map((s) => s.name),
      } satisfies ShopNameSheetData,
    });

    ref.afterDismissed().subscribe((result?: ShopNameSheetResult) => {
      if (result) {
        this.store.dispatch(shopsApiActions.addShopRequested({ name: result.name }));
      }
    });
  }

  openRenameSheet(shop: Shop): void {
    const ref = this.bottomSheet.open(ShopNameSheetComponent, {
      data: {
        mode: 'rename',
        currentName: shop.name,
        existingNames: this.shops().map((s) => s.name),
      } satisfies ShopNameSheetData,
    });

    ref.afterDismissed().subscribe((result?: ShopNameSheetResult) => {
      if (result) {
        this.store.dispatch(shopsApiActions.renameShopRequested({ id: shop.id, name: result.name }));
      }
    });
  }

  deleteShop(shop: Shop): void {
    const confirmed = confirm(`Delete "${shop.name}"? This cannot be undone.`);
    if (confirmed) {
      this.store.dispatch(shopsApiActions.deleteShopRequested({ id: shop.id }));
    }
  }
}
