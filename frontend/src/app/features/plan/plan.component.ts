import { ChangeDetectionStrategy, Component, ElementRef, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  selectActiveSessionCheckedItemIds,
  selectGroupedPlanList,
  selectGroupedPlanListWithChecked,
  type PlanListGroup,
} from '../../store/selectors/grouped-plan-list.selectors';
import { ThemeService } from '../../core/theme/theme.service';
import { selectListDataLoaded } from '../../store/selectors/list-data-loaded.selectors';
import { selectOrderedCategories } from '../../store/selectors/ordered-categories.selectors';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { selectActiveItems } from '../../store/items/items.selectors';
import { selectSelectedShopId } from '../../store/ui/ui.selectors';
import { itemsApiActions } from '../../store/items/items.actions';
import {
  ItemSheetComponent,
  ItemSheetData,
  ItemSheetResult,
} from './item-sheet.component';
import {
  ConfirmRemoveItemDialogComponent,
  ConfirmRemoveItemData,
} from './confirm-remove-item-dialog.component';
import {
  PriceProductDialogComponent,
  PriceProductDialogData,
} from './price-product-dialog.component';
import {
  AddItemPillComponent,
  AddItemRequest,
} from './add-item-pill.component';
import { MoneyPipe } from '../../core/format/money.pipe';
import { EffectivePricePipe } from '../../core/format/effective-price.pipe';
import type { Item } from '../../models/item.model';
import type { CategoryId, ItemId, ShopId } from '../../models/ids.model';

interface PlanFlatRow {
  item: Item;
  categoryColor: string | null;
  isChecked: boolean;
}

@Component({
  selector: 'app-plan',
  imports: [
    NgTemplateOutlet,
    MatIcon,
    TranslocoPipe,
    AddItemPillComponent,
    MoneyPipe,
    EffectivePricePipe,
  ],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanComponent {
  private readonly store = inject(Store);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly themeService = inject(ThemeService);

  readonly loaded = toSignal(this.store.select(selectListDataLoaded), {
    initialValue: false,
  });

  private readonly groupsActive = toSignal(this.store.select(selectGroupedPlanList), {
    initialValue: [] as PlanListGroup[],
  });

  private readonly groupsWithChecked = toSignal(
    this.store.select(selectGroupedPlanListWithChecked),
    { initialValue: [] as PlanListGroup[] },
  );

  readonly checkedItemIds = toSignal(
    this.store.select(selectActiveSessionCheckedItemIds),
    { initialValue: new Set<ItemId>() },
  );

  readonly hideGrouping = computed(
    () => this.themeService.settings().hideCategoryGrouping,
  );
  readonly hidePrices = computed(
    () => this.themeService.settings().hidePrices,
  );
  readonly showChecked = computed(
    () => this.themeService.settings().showCheckedItems,
  );

  readonly groups = computed<PlanListGroup[]>(() =>
    this.showChecked() ? this.groupsWithChecked() : this.groupsActive(),
  );

  readonly flatRows = computed<PlanFlatRow[]>(() => {
    const checked = this.checkedItemIds();
    const rows: PlanFlatRow[] = [];
    for (const group of this.groups()) {
      for (const item of group.items) {
        rows.push({
          item,
          categoryColor: group.categoryColor,
          isChecked: checked.has(item.id),
        });
      }
    }
    return rows;
  });

  isItemChecked(id: ItemId): boolean {
    return this.checkedItemIds().has(id);
  }

  private readonly shopOrderedCategories = toSignal(
    this.store.select(selectOrderedCategories),
    { initialValue: [] },
  );

  private readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
  });

  readonly selectedShopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null as ShopId | null,
  });

  readonly activeItems = toSignal(this.store.select(selectActiveItems), {
    initialValue: [],
  });

  readonly existingNamesList = computed(() =>
    this.activeItems().map((i) => i.name),
  );

  onAddRequested(req: AddItemRequest): void {
    this.store.dispatch(
      itemsApiActions.addItemRequested({
        name: req.name,
        description: null,
        quantity: req.quantity,
        unit: req.unit,
        primaryCategoryId: req.primaryCategoryId,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      }),
    );
    this.scrollToItemAfterRender(req.name);
  }

  private scrollToItemAfterRender(name: string): void {
    setTimeout(() => {
      const el = this.host.nativeElement;
      const buttons = el.querySelectorAll('.app-plan__item-name');
      for (const btn of buttons) {
        if (btn.textContent?.trim() === name) {
          btn.closest('.app-plan__item')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          return;
        }
      }
    }, 300);
  }

  openEditSheet(item: Item): void {
    const ref = this.bottomSheet.open(ItemSheetComponent, {
      data: {
        mode: 'edit',
        currentName: item.name,
        currentDescription: item.description,
        currentQuantity: item.quantity,
        currentUnit: item.unit,
        currentPrimaryCategoryId: item.primaryCategoryId,
        currentSecondaryCategoryIds: item.secondaryCategoryIds,
        currentSizePerPieceQuantity: item.sizePerPieceQuantity,
        currentSizePerPieceUnit: item.sizePerPieceUnit,
        existingNames: this.activeItems()
          .filter((i) => i.id !== item.id)
          .map((i) => i.name),
        categories: this.shopOrderedCategories(),
      } satisfies ItemSheetData,
    });

    ref.afterDismissed().subscribe((result?: ItemSheetResult) => {
      if (result) {
        this.store.dispatch(
          itemsApiActions.updateItemRequested({
            id: item.id,
            name: result.name,
            description: result.description,
            quantity: result.quantity,
            unit: result.unit,
            primaryCategoryId: result.primaryCategoryId,
            secondaryCategoryIds: result.secondaryCategoryIds,
            sizePerPieceQuantity: result.sizePerPieceQuantity,
            sizePerPieceUnit: result.sizePerPieceUnit,
          }),
        );
      }
    });
  }

  canInspectPrice(item: Item): boolean {
    // Inspectable when the pipeline left any verifiable trace — matched
    // product name, product URL, or at minimum the search URL it used.
    // Manually-entered prices have none of these and render as static text.
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

  confirmRemove(item: Item): void {
    const ref = this.dialog.open<
      ConfirmRemoveItemDialogComponent,
      ConfirmRemoveItemData,
      boolean
    >(ConfirmRemoveItemDialogComponent, {
      data: { name: item.name },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.dispatch(
          itemsApiActions.removeItemRequested({ id: item.id }),
        );
      }
    });
  }

}
