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
import {
  ShopPriceUrlSheetComponent,
  ShopPriceUrlSheetData,
  ShopPriceUrlSheetResult,
} from './shop-price-url-sheet.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { Shop } from '../../models/shop.model';
import type { ShopId } from '../../models/ids.model';

@Component({
  selector: 'app-manage-shops',
  imports: [
    MatIconButton,
    MatFabButton,
    MatIcon,
    TranslocoPipe,
  ],
  templateUrl: './manage-shops.component.html',
  styleUrl: './manage-shops.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageShopsComponent {
  private readonly store = inject(Store);
  private readonly location = inject(Location);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly transloco = inject(TranslocoService);

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

  openPriceUrlSheet(shop: Shop): void {
    const ref = this.bottomSheet.open(ShopPriceUrlSheetComponent, {
      data: {
        shopName: shop.name,
        currentUrl: shop.priceSearchUrl,
      } satisfies ShopPriceUrlSheetData,
    });

    ref.afterDismissed().subscribe((result?: ShopPriceUrlSheetResult) => {
      if (result !== undefined) {
        this.store.dispatch(
          shopsApiActions.setShopPriceUrlRequested({ id: shop.id, url: result.url }),
        );
      }
    });
  }

  deleteShop(shop: Shop): void {
    const message = this.transloco.translate('manageShops.deleteConfirm', { name: shop.name });
    if (confirm(message)) {
      this.store.dispatch(shopsApiActions.deleteShopRequested({ id: shop.id }));
    }
  }
}
