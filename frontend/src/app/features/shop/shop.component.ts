import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ShopCategorySectionComponent, SessionCategoryTotals } from '../shared/shop-category-section.component';
import { selectGroupedShopList, selectCategoryTotalsForSession } from '../../store/derived/list.selectors';
import { selectSelectedShopId, selectPendingUndo } from '../../store/ui/ui.selectors';
import { selectCurrentUser } from '../../store/account/account.selectors';
import { selectMyActiveSession } from '../../store/sessions/sessions.selectors';
import { itemsActions } from '../../store/items/items.actions';
import { uiActions } from '../../store/ui/ui.actions';
import { switchMap } from 'rxjs';
import type { ItemId, CategoryId } from '../../models/ids.model';
import type { GroupedListEntry } from '../../store/derived/list.selectors';

/**
 * Shop mode container component.
 * Shows items grouped by all assigned categories with session totals.
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [ShopCategorySectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shop">
      @if (groups().length === 0) {
        <p class="shop__empty">All items are checked or the list is empty.</p>
      }

      @for (group of groups(); track group.category?.id ?? 'uncategorised') {
        <app-shop-category-section
          [group]="group"
          [totals]="totalsForGroup(group)"
          [pendingItemIds]="pendingItemIdSet()"
          (itemChecked)="checkItem($event)"
          (itemUnchecked)="uncheckItem($event)"
        />
      }
    </main>
  `,
  styles: [`
    .shop__empty {
      padding: 3rem 2rem;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }
  `],
})
export class ShopComponent {
  private readonly store = inject(Store);

  private readonly shopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null,
  });

  private readonly currentUser = toSignal(this.store.select(selectCurrentUser), {
    initialValue: null,
  });

  private readonly activeSession = toSignal(
    this.store.select(selectCurrentUser).pipe(
      switchMap((user) =>
        this.store.select(
          user ? selectMyActiveSession(user.id) : (() => null as never),
        ),
      ),
    ),
    { initialValue: null },
  );

  private readonly pendingUndo = toSignal(this.store.select(selectPendingUndo), {
    initialValue: null,
  });

  private readonly categoryTotalsMap = toSignal(
    this.store.select(selectCurrentUser).pipe(
      switchMap((user) => {
        const session = this.activeSession();
        return this.store.select(
          selectCategoryTotalsForSession(session?.id ?? null),
        );
      }),
    ),
    { initialValue: new Map() },
  );

  readonly groups = toSignal(
    this.store.select(selectSelectedShopId).pipe(
      switchMap((shopId) =>
        this.store.select(selectGroupedShopList(shopId)),
      ),
    ),
    { initialValue: [] as GroupedListEntry[] },
  );

  readonly pendingItemIdSet = computed(() => {
    const pending = this.pendingUndo();
    return pending ? new Set([pending.itemId]) : new Set<string>();
  });

  totalsForGroup(group: GroupedListEntry): SessionCategoryTotals {
    const catId = group.category?.id ?? null;
    const totals = this.categoryTotalsMap().get(catId as CategoryId | null);
    return {
      estimated: totals?.estimated ?? null,
      sessionChecked: totals?.sessionChecked ?? 0,
    };
  }

  checkItem(id: ItemId): void {
    const session = this.activeSession();
    if (!session) return;
    this.store.dispatch(itemsActions.checkItemRequested({ id, sessionId: session.id }));
  }

  uncheckItem(id: ItemId): void {
    const session = this.activeSession();
    if (!session) return;
    this.store.dispatch(uiActions.checkUndoCancelled());
  }
}
