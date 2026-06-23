import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
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
import { selectCategoryEntities } from '../../store/categories/categories.selectors';
import type { Dictionary } from '@ngrx/entity';
import type { Category } from '../../models/category.model';
import { itemsActions, itemsApiActions } from '../../store/items/items.actions';
import type { PendingCheck } from '../../store/items/items.reducer';
import { MoneyPipe } from '../../core/format/money.pipe';
import { EffectivePricePipe } from '../../core/format/effective-price.pipe';
import { HapticsService } from '../../core/haptics/haptics.service';
import { ThemeService } from '../../core/theme/theme.service';
import {
  PriceProductDialogComponent,
  PriceProductDialogData,
} from '../plan/price-product-dialog.component';
import type { Item } from '../../models/item.model';
import type { ItemId, ShopId } from '../../models/ids.model';

interface ShopFlatRow {
  item: Item;
  categoryColor: string | null;
}

@Component({
  selector: 'app-shop',
  imports: [NgTemplateOutlet, MatIcon, TranslocoPipe, MoneyPipe, EffectivePricePipe],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent {
  private readonly store = inject(Store);
  private readonly haptics = inject(HapticsService);
  private readonly dialog = inject(MatDialog);
  private readonly themeService = inject(ThemeService);

  private readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
  });

  private readonly categoryEntities = toSignal(
    this.store.select(selectCategoryEntities),
    { initialValue: {} as Dictionary<Category> },
  );

  readonly loaded = toSignal(this.store.select(selectListDataLoaded), {
    initialValue: false,
  });

  readonly groups = toSignal(this.store.select(selectGroupedShopList), {
    initialValue: [],
  });

  readonly hideGrouping = computed(
    () => this.themeService.settings().hideCategoryGrouping,
  );

  readonly flatRows = computed<ShopFlatRow[]>(() => {
    const cats = this.categoryEntities();
    const seen = new Set<ItemId>();
    const rows: ShopFlatRow[] = [];
    for (const group of this.groups()) {
      for (const item of group.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        const primaryColor = item.primaryCategoryId
          ? cats[item.primaryCategoryId]?.color ?? null
          : null;
        rows.push({ item, categoryColor: primaryColor });
      }
    }
    return rows;
  });

  readonly activeSession = toSignal(
    this.store.select(selectActiveSessionForCurrentShop),
    { initialValue: null },
  );

  readonly selectedShopId = computed<ShopId | null>(
    () => this.activeSession()?.shopId ?? null,
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
    const shopId = this.selectedShopId();
    const shopEntry = shopId ? item.shopPrices[shopId] ?? null : null;
    const priceShopId = shopEntry ? shopId : item.priceShopId;
    const shop = this.shops().find((s) => s.id === priceShopId);
    this.dialog.open<PriceProductDialogComponent, PriceProductDialogData>(
      PriceProductDialogComponent,
      {
        data: {
          itemId: item.id,
          itemName: item.name,
          productName: shopEntry?.priceProductName ?? item.priceProductName,
          productUrl: shopEntry?.priceProductUrl ?? item.priceProductUrl,
          searchUrl: shopEntry?.priceSearchUrl ?? item.priceSearchUrl,
          shopName: shop?.name ?? null,
          price: shopEntry?.price ?? item.price,
          priceQuantity: shopEntry?.priceQuantity ?? item.priceQuantity,
          priceUnit: shopEntry?.priceUnit ?? item.priceUnit,
          priceUpdatedAt: shopEntry?.priceUpdatedAt ?? item.priceUpdatedAt,
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
