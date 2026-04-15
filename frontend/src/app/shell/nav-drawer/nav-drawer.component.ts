import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { selectSelectedShopId } from '../../store/ui/ui.selectors';
import { selectOrderedCategories } from '../../store/selectors/ordered-categories.selectors';
import { uiActions } from '../../store/ui/ui.actions';
import { shopsApiActions } from '../../store/shops/shops.actions';
import type { Category } from '../../models/category.model';
import type { CategoryId, ShopId } from '../../models/ids.model';

@Component({
  selector: 'app-nav-drawer',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatIcon,
    MatDivider,
    TranslocoPipe,
  ],
  templateUrl: './nav-drawer.component.html',
  styleUrl: './nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavDrawerComponent {
  private readonly store = inject(Store);

  readonly shops = toSignal(this.store.select(selectAllShops), { initialValue: [] });
  readonly selectedShopId = toSignal(this.store.select(selectSelectedShopId), { initialValue: null });
  readonly orderedCategories = toSignal(this.store.select(selectOrderedCategories), { initialValue: [] });

  readonly categorySelected = output<CategoryId>();
  readonly manageShops = output<void>();
  readonly addCategory = output<void>();

  onShopChanged(shopId: string): void {
    const id = shopId === '' ? null : (shopId as ShopId);
    this.store.dispatch(uiActions.planModeShopSelected({ shopId: id }));
  }

  onCategoryTap(categoryId: CategoryId): void {
    this.categorySelected.emit(categoryId);
  }

  onCategoryDrop(event: CdkDragDrop<Category[]>): void {
    const categories = [...this.orderedCategories()];
    moveItemInArray(categories, event.previousIndex, event.currentIndex);
    const orderedIds = categories.map((c) => c.id);

    const shopId = this.selectedShopId();
    if (shopId) {
      this.store.dispatch(shopsApiActions.setShopCategoryOrderRequested({ shopId, orderedIds }));
    }
  }

  onManageShops(): void {
    this.manageShops.emit();
  }

  onAddCategory(): void {
    this.addCategory.emit();
  }
}
