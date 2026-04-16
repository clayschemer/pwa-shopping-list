import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectGroupedShopList } from '../../store/selectors/grouped-shop-list.selectors';
import { selectActiveSessionForCurrentUser } from '../../store/sessions/sessions.selectors';
import { selectPendingChecks } from '../../store/items/items.selectors';
import { itemsActions, itemsApiActions } from '../../store/items/items.actions';
import type { PendingCheck } from '../../store/items/items.reducer';
import { MoneyPipe } from '../../core/format/money.pipe';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';

@Component({
  selector: 'app-shop',
  imports: [MatIcon, TranslocoPipe, MoneyPipe],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent {
  private readonly store = inject(Store);

  readonly groups = toSignal(this.store.select(selectGroupedShopList), {
    initialValue: [],
  });

  readonly activeSession = toSignal(
    this.store.select(selectActiveSessionForCurrentUser),
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

    this.store.dispatch(
      itemsActions.checkItemPending({ id: item.id, sessionId: session.id }),
    );
  }
}
