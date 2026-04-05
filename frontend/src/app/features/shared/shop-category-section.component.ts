import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ShopItemRowComponent } from './shop-item-row.component';
import type { GroupedListEntry } from '../../store/derived/list.selectors';
import type { ItemId } from '../../models/ids.model';

export interface SessionCategoryTotals {
  estimated: number | null;
  sessionChecked: number;
}

/**
 * Presentational component for a category section in shop mode.
 * Renders category header with Est/session totals + shop item rows.
 * No store access.
 */
@Component({
  selector: 'app-shop-category-section',
  standalone: true,
  imports: [ShopItemRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="shop-cat">
      <header class="shop-cat__header">
        <h2 class="shop-cat__name">{{ categoryName() }}</h2>
        <div class="shop-cat__totals">
          @if (totals().estimated !== null) {
            <span class="shop-cat__est">Est. £{{ totals().estimated!.toFixed(2) }}</span>
          }
          @if (totals().sessionChecked > 0) {
            <span class="shop-cat__checked">✓ £{{ totals().sessionChecked.toFixed(2) }}</span>
          }
        </div>
      </header>

      <ul class="shop-cat__items" role="list">
        @for (item of group().items; track item.id) {
          <li role="listitem">
            <app-shop-item-row
              [item]="item"
              [pending]="pendingItemIds().has(item.id)"
              (checked)="itemChecked.emit($event)"
              (unchecked)="itemUnchecked.emit($event)"
            />
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .shop-cat__header {
      display: flex;
      align-items: center;
      padding: 1rem 1rem 0.25rem;
      gap: 0.5rem;
    }

    .shop-cat__name {
      flex: 1;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }

    .shop-cat__totals {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .shop-cat__checked {
      color: var(--mat-sys-primary);
    }

    .shop-cat__items {
      list-style: none;
      margin: 0;
      padding: 0;
    }
  `],
})
export class ShopCategorySectionComponent {
  readonly group = input.required<GroupedListEntry>();
  readonly totals = input.required<SessionCategoryTotals>();
  readonly pendingItemIds = input<Set<string>>(new Set());
  readonly itemChecked = output<ItemId>();
  readonly itemUnchecked = output<ItemId>();

  readonly categoryName = computed(() =>
    this.group().category?.name ?? 'Uncategorised',
  );
}
