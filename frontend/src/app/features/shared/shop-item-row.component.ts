import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';

/**
 * Presentational item row for shop mode.
 * Shows checkbox instead of remove button.
 * Pending state (dimmed + strikethrough) shown during 4-second undo window.
 */
@Component({
  selector: 'app-shop-item-row',
  standalone: true,
  imports: [MatCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shop-item-row" [class.shop-item-row--pending]="pending()">
      <div class="shop-item-row__content">
        <span class="shop-item-row__name">{{ item().name }}</span>
        @if (item().description) {
          <span class="shop-item-row__description">{{ item().description }}</span>
        }
      </div>
      <div class="shop-item-row__meta">
        @if (qtyDisplay()) {
          <span class="shop-item-row__qty">{{ qtyDisplay() }}</span>
        }
        @if (pending()) {
          <span class="shop-item-row__undo-hint" role="status">tap to undo</span>
        } @else if (item().price !== null) {
          <span class="shop-item-row__price">{{ priceDisplay() }}</span>
        }
      </div>
      <button
        class="shop-item-row__checkbox-zone"
        [attr.aria-label]="item().name + (pending() ? ' — tap to undo' : '')"
        [attr.aria-pressed]="pending()"
        (click)="onCheckboxClick()"
      >
        <mat-checkbox
          [checked]="pending()"
          [disabled]="false"
          tabindex="-1"
          aria-hidden="true"
        />
      </button>
    </div>
  `,
  styles: [`
    .shop-item-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 0 0.75rem 1rem;
      min-height: 2.75rem;
      transition: opacity 150ms ease;
    }

    .shop-item-row--pending {
      opacity: 0.42;
    }

    .shop-item-row--pending .shop-item-row__name {
      text-decoration: line-through;
    }

    .shop-item-row__content {
      flex: 1;
      min-width: 0;
    }

    .shop-item-row__name {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .shop-item-row__description {
      display: block;
      font-size: 0.875rem;
      font-style: italic;
      color: var(--mat-sys-on-surface-variant);
    }

    .shop-item-row__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .shop-item-row__qty {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .shop-item-row__price {
      font-size: 0.75rem;
      color: var(--mat-sys-outline);
    }

    .shop-item-row__undo-hint {
      font-size: 0.75rem;
      color: var(--mat-sys-tertiary);
    }

    .shop-item-row__checkbox-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      min-height: 2.75rem;
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
  `],
})
export class ShopItemRowComponent {
  readonly item = input.required<Item>();
  readonly pending = input<boolean>(false);
  readonly checked = output<ItemId>();
  readonly unchecked = output<ItemId>();

  readonly qtyDisplay = computed(() => {
    const { quantity, unit } = this.item();
    if (quantity === null) return null;
    return unit ? `${quantity} ${unit}` : `${quantity}`;
  });

  readonly priceDisplay = computed(() => {
    const { price, priceQuantity, priceUnit } = this.item();
    if (price === null) return null;
    if (priceQuantity && priceUnit) {
      return `£${price.toFixed(2)} / ${priceQuantity} ${priceUnit}`;
    }
    return `£${price.toFixed(2)}`;
  });

  onCheckboxClick(): void {
    if (this.pending()) {
      this.unchecked.emit(this.item().id);
    } else {
      this.checked.emit(this.item().id);
    }
  }
}
