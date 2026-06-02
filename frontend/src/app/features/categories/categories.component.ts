import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  CdkDropList,
  CdkDrag,
  CdkDragHandle,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectAllCategories } from '../../store/categories/categories.selectors';
import { selectAllShops, selectShopEntities } from '../../store/shops/shops.selectors';
import type { Dictionary } from '@ngrx/entity';
import type { Shop } from '../../models/shop.model';
import { categoriesApiActions } from '../../store/categories/categories.actions';
import { shopsApiActions } from '../../store/shops/shops.actions';
import {
  CategoryEditSheetComponent,
  CategoryEditSheetData,
  CategoryEditSheetResult,
} from './category-edit-sheet/category-edit-sheet.component';
import {
  DeleteCategoryDialogComponent,
  DeleteCategoryData,
} from './delete-category-dialog.component';
import type { Category } from '../../models/category.model';
import type { CategoryId, ShopId } from '../../models/ids.model';

/**
 * "Order for:" picker value. `null` means the global order; otherwise the
 * specific shop whose `categoryOrder` is being viewed and edited.
 */
type Layout = null | ShopId;

@Component({
  selector: 'app-categories',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatIcon,
    MatIconButton,
    MatFabButton,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    TranslocoPipe,
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);

  readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
  });
  private readonly shopEntities = toSignal(this.store.select(selectShopEntities), {
    initialValue: {} as Dictionary<Shop>,
  });
  private readonly categories = toSignal(this.store.select(selectAllCategories), {
    initialValue: [] as Category[],
  });

  readonly layout = signal<Layout>(this.parseLayoutFromQuery());

  readonly orderedCategories = computed<Category[]>(() => {
    const all = this.categories();
    const lay = this.layout();
    if (lay === null) return all; // already sorted by globalSortOrder via adapter
    const shop = this.shopEntities()[lay];
    if (!shop) return all;
    return orderByShop(all, shop.categoryOrder);
  });

  goBack(): void {
    // Prefer the explicit referrer; fall back to plan view.
    this.router.navigateByUrl('/');
  }

  onLayoutChange(value: string): void {
    this.layout.set(value === '' ? null : (value as ShopId));
  }

  onCategoryDrop(event: CdkDragDrop<Category[]>): void {
    const list = [...this.orderedCategories()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    const orderedIds = list.map((c) => c.id);

    const lay = this.layout();
    if (lay === null) {
      this.store.dispatch(
        categoriesApiActions.setGlobalCategoryOrderRequested({ orderedIds }),
      );
    } else {
      this.store.dispatch(
        shopsApiActions.setShopCategoryOrderRequested({ shopId: lay, orderedIds }),
      );
    }
  }

  openCreate(): void {
    const ref = this.bottomSheet.open<
      CategoryEditSheetComponent,
      CategoryEditSheetData,
      CategoryEditSheetResult
    >(CategoryEditSheetComponent, {
      data: {
        mode: 'create',
        existingNames: this.categories().map((c) => c.name),
      },
    });
    ref.afterDismissed().subscribe((result) => {
      if (result?.kind !== 'create') return;
      this.store.dispatch(
        categoriesApiActions.addCategoryRequested({
          name: result.name,
          color: result.color,
        }),
      );
    });
  }

  openEdit(category: Category): void {
    const shops = this.shops();
    const ref = this.bottomSheet.open<
      CategoryEditSheetComponent,
      CategoryEditSheetData,
      CategoryEditSheetResult
    >(CategoryEditSheetComponent, {
      data: {
        mode: 'edit',
        categoryId: category.id,
        currentName: category.name,
        currentColor: category.color,
        existingNames: this.categories()
          .filter((c) => c.id !== category.id)
          .map((c) => c.name),
        shops: shops.map((s) => ({
          id: s.id,
          name: s.name,
          includes: s.categoryOrder.includes(category.id),
        })),
      },
    });

    ref.afterDismissed().subscribe((result) => {
      if (!result) return;
      if (result.kind === 'delete') {
        this.confirmDelete(category);
        return;
      }
      if (result.kind !== 'edit-save') return;

      const nameChanged = result.name !== category.name;
      const colorChanged = result.color !== category.color;
      if (nameChanged || colorChanged) {
        this.store.dispatch(
          categoriesApiActions.renameCategoryRequested({
            id: category.id,
            name: result.name,
            color: result.color,
          }),
        );
      }

      const shopMap = new Map(shops.map((s) => [s.id, s]));
      for (const shopId of result.addedShops) {
        const shop = shopMap.get(shopId);
        if (!shop || shop.categoryOrder.includes(category.id)) continue;
        this.store.dispatch(
          shopsApiActions.setShopCategoryOrderRequested({
            shopId,
            orderedIds: [...shop.categoryOrder, category.id],
          }),
        );
      }
      for (const shopId of result.removedShops) {
        const shop = shopMap.get(shopId);
        if (!shop || !shop.categoryOrder.includes(category.id)) continue;
        this.store.dispatch(
          shopsApiActions.setShopCategoryOrderRequested({
            shopId,
            orderedIds: shop.categoryOrder.filter((id) => id !== category.id),
          }),
        );
      }
    });
  }

  private confirmDelete(category: Category): void {
    const ref = this.dialog.open<
      DeleteCategoryDialogComponent,
      DeleteCategoryData,
      boolean
    >(DeleteCategoryDialogComponent, {
      data: { name: category.name },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.dispatch(
          categoriesApiActions.deleteCategoryRequested({ id: category.id }),
        );
      }
    });
  }

  private parseLayoutFromQuery(): Layout {
    const param = this.route.snapshot.queryParamMap.get('layout');
    if (!param || param === 'global') return null;
    return param as ShopId;
  }
}

function orderByShop(categories: Category[], order: CategoryId[]): Category[] {
  const map = new Map(categories.map((c) => [c.id, c]));
  const ordered: Category[] = [];
  const seen = new Set<CategoryId>();
  for (const id of order) {
    const c = map.get(id);
    if (c) {
      ordered.push(c);
      seen.add(id);
    }
  }
  for (const c of categories) if (!seen.has(c.id)) ordered.push(c);
  return ordered;
}
