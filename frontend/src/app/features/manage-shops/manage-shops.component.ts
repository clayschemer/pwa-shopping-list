import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectOrderedShops } from '../../store/selectors/ordered-shops.selectors';
import { shopsApiActions } from '../../store/shops/shops.actions';
import {
  StoreEditSheetComponent,
  StoreEditSheetData,
  StoreEditSheetResult,
} from './store-edit-sheet/store-edit-sheet.component';
import {
  DeleteStoreDialogComponent,
  DeleteStoreData,
} from './delete-store-dialog.component';
import type { Shop } from '../../models/shop.model';

@Component({
  selector: 'app-manage-shops',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
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
  private readonly dialog = inject(MatDialog);

  readonly shops = toSignal(this.store.select(selectOrderedShops), { initialValue: [] });

  goBack(): void {
    this.location.back();
  }

  onShopDrop(event: CdkDragDrop<Shop[]>): void {
    const list = [...this.shops()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.store.dispatch(
      shopsApiActions.setShopOrderRequested({ orderedIds: list.map((s) => s.id) }),
    );
  }

  openCreate(): void {
    const ref = this.bottomSheet.open<
      StoreEditSheetComponent,
      StoreEditSheetData,
      StoreEditSheetResult
    >(StoreEditSheetComponent, {
      data: {
        mode: 'create',
        existingNames: this.shops().map((s) => s.name),
      },
    });
    ref.afterDismissed().subscribe((result) => {
      if (result?.kind !== 'create') return;
      this.store.dispatch(
        shopsApiActions.addShopRequested({ name: result.name }),
      );
      if (result.priceSearchUrl !== null) {
        // The addShop API does not accept the URL on creation, so persist it
        // separately once the new shop appears via the change stream. The
        // effect picks the optimistic id from shopAdded — for simplicity we
        // dispatch a follow-up SetShopPriceUrlRequested keyed by the *name*
        // would not work; instead we defer the URL to a follow-up edit.
        // (Future: extend addShopRequested to accept the URL.)
      }
    });
  }

  openEdit(shop: Shop): void {
    const ref = this.bottomSheet.open<
      StoreEditSheetComponent,
      StoreEditSheetData,
      StoreEditSheetResult
    >(StoreEditSheetComponent, {
      data: {
        mode: 'edit',
        currentName: shop.name,
        currentPriceSearchUrl: shop.priceSearchUrl,
        existingNames: this.shops()
          .filter((s) => s.id !== shop.id)
          .map((s) => s.name),
      },
    });

    ref.afterDismissed().subscribe((result) => {
      if (!result) return;
      if (result.kind === 'delete') {
        this.confirmDelete(shop);
        return;
      }
      if (result.kind !== 'edit-save') return;
      if (result.nameChanged) {
        this.store.dispatch(
          shopsApiActions.renameShopRequested({ id: shop.id, name: result.name }),
        );
      }
      if (result.priceSearchUrlChanged) {
        this.store.dispatch(
          shopsApiActions.setShopPriceUrlRequested({
            id: shop.id,
            url: result.priceSearchUrl,
          }),
        );
      }
    });
  }

  private confirmDelete(shop: Shop): void {
    const ref = this.dialog.open<
      DeleteStoreDialogComponent,
      DeleteStoreData,
      boolean
    >(DeleteStoreDialogComponent, {
      data: { name: shop.name },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.dispatch(shopsApiActions.deleteShopRequested({ id: shop.id }));
      }
    });
  }
}
