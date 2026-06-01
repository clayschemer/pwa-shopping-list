import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectGroupedShopList } from '../../store/selectors/grouped-shop-list.selectors';
import { selectListDataLoaded } from '../../store/selectors/list-data-loaded.selectors';
import { selectActiveSessionForCurrentShop } from '../../store/sessions/sessions.selectors';
import { selectPendingChecks } from '../../store/items/items.selectors';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { itemsActions, itemsApiActions } from '../../store/items/items.actions';
import type { PendingCheck } from '../../store/items/items.reducer';
import { MoneyPipe } from '../../core/format/money.pipe';
import { EffectivePricePipe } from '../../core/format/effective-price.pipe';
import { HapticsService } from '../../core/haptics/haptics.service';
import {
  PriceProductDialogComponent,
  PriceProductDialogData,
} from '../plan/price-product-dialog.component';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';

@Component({
  selector: 'app-shop',
  imports: [MatIcon, TranslocoPipe, MoneyPipe, EffectivePricePipe],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent {
  private readonly store = inject(Store);
  private readonly haptics = inject(HapticsService);
  private readonly dialog = inject(MatDialog);

  private readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
  });

  readonly loaded = toSignal(this.store.select(selectListDataLoaded), {
    initialValue: false,
  });

  readonly groups = toSignal(this.store.select(selectGroupedShopList), {
    initialValue: [],
  });

  readonly activeSession = toSignal(
    this.store.select(selectActiveSessionForCurrentShop),
    { initialValue: null },
  );

  readonly pendingChecks = toSignal(this.store.select(selectPendingChecks), {
    initialValue: {} as Record<ItemId, PendingCheck>,
  });

  readonly checkedItemIds = computed(() => {
    const session = this.activeSession();
    return new Set((session?.checkedItems ?? []).map((c) => c.itemId));
  });

  isPending(itemId: ItemId): boolean {
    return this.pendingChecks()[itemId] !== undefined;
  }

  isChecked(itemId: ItemId): boolean {
    return this.checkedItemIds().has(itemId);
  }

  canInspectPrice(item: Item): boolean {
    return !!(item.priceProductName || item.priceProductUrl || item.priceSearchUrl);
  }

  openPriceDialog(item: Item): void {
    const shop = this.shops().find((s) => s.id === item.priceShopId);
    this.dialog.open<PriceProductDialogComponent, PriceProductDialogData>(
      PriceProductDialogComponent,
      {
        data: {
          itemId: item.id,
          itemName: item.name,
          productName: item.priceProductName,
          productUrl: item.priceProductUrl,
          searchUrl: item.priceSearchUrl,
          shopName: shop?.name ?? null,
          price: item.price,
          priceQuantity: item.priceQuantity,
          priceUnit: item.priceUnit,
          priceUpdatedAt: item.priceUpdatedAt,
        },
      },
    );
  }

  onToggleCheck(item: Item): void {
    const session = this.activeSession();
    if (!session) return;

    if (this.isPending(item.id)) {
      this.store.dispatch(
        itemsActions.checkItemUndoneDuringWindow({ id: item.id }),
      );
      return;
    }

    if (this.isChecked(item.id)) {
      this.store.dispatch(
        itemsApiActions.uncheckItemRequested({
          id: item.id,
          sessionId: session.id,
        }),
      );
      return;
    }

    this.haptics.checkConfirm();
    this.store.dispatch(
      itemsActions.checkItemPending({ id: item.id, sessionId: session.id }),
    );
  }
}
