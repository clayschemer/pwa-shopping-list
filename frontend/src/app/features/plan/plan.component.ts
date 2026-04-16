import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectGroupedPlanList, type PlanListGroup } from '../../store/selectors/grouped-plan-list.selectors';
import { selectAllCategories } from '../../store/categories/categories.selectors';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { selectActiveItems } from '../../store/items/items.selectors';
import { itemsApiActions } from '../../store/items/items.actions';
import { categoriesApiActions } from '../../store/categories/categories.actions';
import { shopsApiActions } from '../../store/shops/shops.actions';
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
  AddItemPillComponent,
  AddItemRequest,
} from './add-item-pill.component';
import {
  CategoryNameSheetComponent,
  CategoryNameSheetData,
  CategoryNameSheetResult,
} from '../categories/category-name-sheet.component';
import {
  AvailableInShopsSheetComponent,
  AvailableInShopsData,
  AvailableInShopsResult,
} from '../categories/available-in-shops-sheet.component';
import {
  DeleteCategoryDialogComponent,
  DeleteCategoryData,
} from '../categories/delete-category-dialog.component';
import { MoneyPipe } from '../../core/format/money.pipe';
import type { Item } from '../../models/item.model';
import type { CategoryId } from '../../models/ids.model';

@Component({
  selector: 'app-plan',
  imports: [
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    TranslocoPipe,
    AddItemPillComponent,
    MoneyPipe,
  ],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanComponent {
  private readonly store = inject(Store);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);

  readonly groups = toSignal(this.store.select(selectGroupedPlanList), {
    initialValue: [],
  });

  private readonly categories = toSignal(
    this.store.select(selectAllCategories),
    { initialValue: [] },
  );

  private readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
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
      }),
    );
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
        existingNames: this.activeItems()
          .filter((i) => i.id !== item.id)
          .map((i) => i.name),
        categories: this.categories(),
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
          }),
        );
      }
    });
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

  openRenameCategory(group: PlanListGroup): void {
    if (group.categoryId === null || group.categoryName === null) return;
    const categoryId = group.categoryId;
    const ref = this.bottomSheet.open<
      CategoryNameSheetComponent,
      CategoryNameSheetData,
      CategoryNameSheetResult
    >(CategoryNameSheetComponent, {
      data: {
        mode: 'rename',
        currentName: group.categoryName,
        existingNames: this.categories()
          .filter((c) => c.id !== categoryId)
          .map((c) => c.name),
      },
    });

    ref.afterDismissed().subscribe((result) => {
      if (!result) return;
      this.store.dispatch(
        categoriesApiActions.renameCategoryRequested({
          id: categoryId,
          name: result.name,
        }),
      );
    });
  }

  openAvailableInShops(group: PlanListGroup): void {
    if (group.categoryId === null || group.categoryName === null) return;
    const categoryId = group.categoryId;
    const allShops = this.shops();
    const ref = this.bottomSheet.open<
      AvailableInShopsSheetComponent,
      AvailableInShopsData,
      AvailableInShopsResult
    >(AvailableInShopsSheetComponent, {
      data: {
        categoryId,
        categoryName: group.categoryName,
        shops: allShops.map((s) => ({
          id: s.id,
          name: s.name,
          includes: s.categoryOrder.includes(categoryId),
        })),
      },
    });

    ref.afterDismissed().subscribe((result) => {
      if (!result) return;
      const shopMap = new Map(allShops.map((s) => [s.id, s]));
      for (const shopId of result.added) {
        const shop = shopMap.get(shopId);
        if (!shop || shop.categoryOrder.includes(categoryId)) continue;
        this.store.dispatch(
          shopsApiActions.setShopCategoryOrderRequested({
            shopId,
            orderedIds: [...shop.categoryOrder, categoryId],
          }),
        );
      }
      for (const shopId of result.removed) {
        const shop = shopMap.get(shopId);
        if (!shop || !shop.categoryOrder.includes(categoryId)) continue;
        this.store.dispatch(
          shopsApiActions.setShopCategoryOrderRequested({
            shopId,
            orderedIds: shop.categoryOrder.filter((id) => id !== categoryId),
          }),
        );
      }
    });
  }

  confirmDeleteCategory(group: PlanListGroup): void {
    if (group.categoryId === null || group.categoryName === null) return;
    const categoryId = group.categoryId;
    const ref = this.dialog.open<
      DeleteCategoryDialogComponent,
      DeleteCategoryData,
      boolean
    >(DeleteCategoryDialogComponent, {
      data: { name: group.categoryName },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.dispatch(
          categoriesApiActions.deleteCategoryRequested({ id: categoryId }),
        );
      }
    });
  }
}
