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
import { MatIconButton, MatFabButton, MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { selectAllCategories } from '../../store/categories/categories.selectors';
import { selectAllCategoryGroups } from '../../store/category-groups/category-groups.selectors';
import { selectShopEntities } from '../../store/shops/shops.selectors';
import { selectOrderedShops } from '../../store/selectors/ordered-shops.selectors';
import type { Dictionary } from '@ngrx/entity';
import type { Shop } from '../../models/shop.model';
import { categoriesApiActions } from '../../store/categories/categories.actions';
import { categoryGroupsApiActions } from '../../store/category-groups/category-groups.actions';
import { shopsApiActions } from '../../store/shops/shops.actions';
import {
  CategoryEditSheetComponent,
  CategoryEditSheetData,
  CategoryEditSheetResult,
} from './category-edit-sheet/category-edit-sheet.component';
import {
  CategoryGroupEditSheetComponent,
  CategoryGroupEditSheetData,
  CategoryGroupEditSheetResult,
  ShopGroupAvailability,
} from './category-group-edit-sheet/category-group-edit-sheet.component';
import {
  GroupPickerSheetComponent,
  GroupPickerSheetData,
  GroupPickerSheetResult,
} from './group-picker-sheet/group-picker-sheet.component';
import {
  DeleteCategoryDialogComponent,
  DeleteCategoryData,
} from './delete-category-dialog.component';
import {
  DeleteCategoryGroupDialogComponent,
  DeleteCategoryGroupData,
} from './delete-category-group-dialog.component';
import type { Category } from '../../models/category.model';
import type { CategoryGroup } from '../../models/category-group.model';
import type { CategoryGroupId, CategoryId, ShopId } from '../../models/ids.model';

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
    MatButton,
    MatCheckbox,
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
  private readonly transloco = inject(TranslocoService);

  readonly shops = toSignal(this.store.select(selectOrderedShops), {
    initialValue: [],
  });
  private readonly shopEntities = toSignal(this.store.select(selectShopEntities), {
    initialValue: {} as Dictionary<Shop>,
  });
  private readonly categories = toSignal(this.store.select(selectAllCategories), {
    initialValue: [] as Category[],
  });
  readonly groups = toSignal(this.store.select(selectAllCategoryGroups), {
    initialValue: [] as CategoryGroup[],
  });

  readonly layout = signal<Layout>(this.parseLayoutFromQuery());

  readonly selecting = signal(false);
  readonly selectedIds = signal<ReadonlySet<CategoryId>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly orderedCategories = computed<Category[]>(() => {
    const all = this.categories();
    const lay = this.layout();
    if (lay === null) return all; // already sorted by globalSortOrder via adapter
    const shop = this.shopEntities()[lay];
    if (!shop) return all;
    return orderByShop(all, shop.categoryOrder);
  });

  /**
   * Joined group names per category for the row caption. Built once per change
   * rather than per row per render, and keyed off the active language so the
   * separator — which is a translated string, not a hard-coded ", " — follows a
   * language switch.
   */
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  private readonly groupCaptions = computed(() => {
    this.activeLang();
    const names = new Map(this.groups().map((g) => [g.id, g.name]));
    const separator = this.transloco.translate('categories.groupSeparator');
    const captions = new Map<CategoryId, string>();
    for (const category of this.categories()) {
      captions.set(
        category.id,
        category.groupIds
          .map((id) => names.get(id))
          .filter((n): n is string => !!n)
          .join(separator),
      );
    }
    return captions;
  });

  /** Joined group names for the row caption; empty when ungrouped. */
  groupNamesFor(category: Category): string {
    return this.groupCaptions().get(category.id) ?? '';
  }

  isSelected(id: CategoryId): boolean {
    return this.selectedIds().has(id);
  }

  goBack(): void {
    // Prefer the explicit referrer; fall back to plan view.
    this.router.navigateByUrl('/');
  }

  onLayoutChange(value: string): void {
    this.layout.set(value === '' ? null : (value as ShopId));
  }

  // ---------------------------------------------------------------- selection

  toggleSelectionMode(): void {
    const next = !this.selecting();
    this.selecting.set(next);
    if (!next) this.selectedIds.set(new Set());
  }

  toggleSelected(id: CategoryId): void {
    const next = new Set(this.selectedIds());
    if (!next.delete(id)) next.add(id);
    this.selectedIds.set(next);
  }

  selectAll(): void {
    this.selectedIds.set(new Set(this.orderedCategories().map((c) => c.id)));
  }

  onRowClick(category: Category): void {
    if (this.selecting()) {
      this.toggleSelected(category.id);
      return;
    }
    this.openEdit(category);
  }

  openBulkAddToGroup(): void {
    this.pickGroup('add', (groupId, ids) =>
      categoriesApiActions.addCategoriesToGroupRequested({ ids, groupId }),
    );
  }

  openBulkRemoveFromGroup(): void {
    this.pickGroup('remove', (groupId, ids) =>
      categoriesApiActions.removeCategoriesFromGroupRequested({ ids, groupId }),
    );
  }

  private pickGroup(
    mode: 'add' | 'remove',
    toAction: (groupId: CategoryGroupId, ids: CategoryId[]) => { type: string },
  ): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;

    const ref = this.bottomSheet.open<
      GroupPickerSheetComponent,
      GroupPickerSheetData,
      GroupPickerSheetResult
    >(GroupPickerSheetComponent, { data: { mode, groups: this.groups() } });

    ref.afterDismissed().subscribe((groupId) => {
      if (!groupId) return;
      // One dispatch for the whole selection — the API batches it into a
      // single write rather than one per category.
      this.store.dispatch(toAction(groupId, ids));
      this.selecting.set(false);
      this.selectedIds.set(new Set());
    });
  }

  // ------------------------------------------------------------------- groups

  openGroupCreate(): void {
    const ref = this.bottomSheet.open<
      CategoryGroupEditSheetComponent,
      CategoryGroupEditSheetData,
      CategoryGroupEditSheetResult
    >(CategoryGroupEditSheetComponent, {
      data: { mode: 'create', existingNames: this.groups().map((g) => g.name) },
    });
    ref.afterDismissed().subscribe((result) => {
      if (result?.kind !== 'create') return;
      this.store.dispatch(
        categoryGroupsApiActions.addCategoryGroupRequested({ name: result.name }),
      );
    });
  }

  openGroupEdit(group: CategoryGroup): void {
    const shops = this.shops();
    const memberIds = this.categories()
      .filter((c) => c.groupIds.includes(group.id))
      .map((c) => c.id);

    const ref = this.bottomSheet.open<
      CategoryGroupEditSheetComponent,
      CategoryGroupEditSheetData,
      CategoryGroupEditSheetResult
    >(CategoryGroupEditSheetComponent, {
      data: {
        mode: 'edit',
        groupId: group.id,
        currentName: group.name,
        existingNames: this.groups()
          .filter((g) => g.id !== group.id)
          .map((g) => g.name),
        memberCount: memberIds.length,
        shops: shops.map((s) => ({
          id: s.id,
          name: s.name,
          state: availabilityOf(memberIds, s.categoryOrder),
        })),
      },
    });

    ref.afterDismissed().subscribe((result) => {
      if (!result) return;
      if (result.kind === 'delete') {
        this.confirmDeleteGroup(group);
        return;
      }
      if (result.kind !== 'edit-save') return;

      if (result.name !== group.name) {
        this.store.dispatch(
          categoryGroupsApiActions.renameCategoryGroupRequested({
            id: group.id,
            name: result.name,
          }),
        );
      }

      const memberSet = new Set(memberIds);
      const shopMap = new Map(shops.map((s) => [s.id, s]));

      for (const shopId of result.addedShops) {
        const shop = shopMap.get(shopId);
        if (!shop) continue;
        const missing = memberIds.filter((id) => !shop.categoryOrder.includes(id));
        if (missing.length === 0) continue;
        this.store.dispatch(
          shopsApiActions.setShopCategoryOrderRequested({
            shopId,
            orderedIds: [...shop.categoryOrder, ...missing],
          }),
        );
      }
      for (const shopId of result.removedShops) {
        const shop = shopMap.get(shopId);
        if (!shop) continue;
        const next = shop.categoryOrder.filter((id) => !memberSet.has(id));
        if (next.length === shop.categoryOrder.length) continue;
        this.store.dispatch(
          shopsApiActions.setShopCategoryOrderRequested({ shopId, orderedIds: next }),
        );
      }
    });
  }

  private confirmDeleteGroup(group: CategoryGroup): void {
    const ref = this.dialog.open<
      DeleteCategoryGroupDialogComponent,
      DeleteCategoryGroupData,
      boolean
    >(DeleteCategoryGroupDialogComponent, { data: { name: group.name } });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.dispatch(
          categoryGroupsApiActions.deleteCategoryGroupRequested({ id: group.id }),
        );
      }
    });
  }

  // ------------------------------------------------------------- categories

  onCategoryDrop(event: CdkDragDrop<Category[]>): void {
    const list = [...this.orderedCategories()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    const orderedIds = list.map((c) => c.id);

    const lay = this.layout();
    if (lay === null) {
      this.store.dispatch(
        categoriesApiActions.setGlobalCategoryOrderRequested({ orderedIds }),
      );
      return;
    }

    const shop = this.shopEntities()[lay];
    if (!shop) return;
    // Availability IS membership of categoryOrder, so a reorder must never
    // widen it: the visible list also carries categories excluded from this
    // shop (appended last), and writing those back would silently un-exclude
    // every one of them.
    const members = new Set(shop.categoryOrder);
    this.store.dispatch(
      shopsApiActions.setShopCategoryOrderRequested({
        shopId: lay,
        orderedIds: orderedIds.filter((id) => members.has(id)),
      }),
    );
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

/** How much of a group sits in a shop's category order. */
function availabilityOf(
  memberIds: CategoryId[],
  categoryOrder: CategoryId[],
): ShopGroupAvailability {
  if (memberIds.length === 0) return 'none';
  const inShop = new Set(categoryOrder);
  const present = memberIds.filter((id) => inShop.has(id)).length;
  if (present === 0) return 'none';
  return present === memberIds.length ? 'all' : 'some';
}
