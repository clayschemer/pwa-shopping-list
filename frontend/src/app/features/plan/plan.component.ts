import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectGroupedPlanList } from '../../store/selectors/grouped-plan-list.selectors';
import { selectAllCategories } from '../../store/categories/categories.selectors';
import { selectActiveItems } from '../../store/items/items.selectors';
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
  AddItemPillComponent,
  AddItemRequest,
} from './add-item-pill.component';
import type { Item } from '../../models/item.model';

@Component({
  selector: 'app-plan',
  imports: [MatIcon, TranslocoPipe, AddItemPillComponent],
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
}
