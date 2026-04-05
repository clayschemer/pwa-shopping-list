import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';

/**
 * Presentational item row for plan mode.
 * Renders name, description, qty+unit, price, and remove button.
 * No store access — receives data as inputs, emits events as outputs.
 */
@Component({
  selector: 'app-item-row',
  standalone: true,
  imports: [MatIconButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="item-row">
      <div class="item-row__content">
        <span class="item-row__name">{{ item().name }}</span>
        @if (item().aiMotivation) {
          <span class="item-row__ai-indicator" [title]="item().aiMotivation!">*</span>
        }
        @if (item().description) {
          <span class="item-row__description">{{ item().description }}</span>
        }
      </div>
      <div class="item-row__meta">
        @if (qtyDisplay()) {
          <span class="item-row__qty">{{ qtyDisplay() }}</span>
        }
        @if (item().price !== null) {
          <span class="item-row__price">{{ priceDisplay() }}</span>
        }
      </div>
      <button
        mat-icon-button
        class="item-row__remove"
        aria-label="Remove {{ item().name }}"
        (click)="removed.emit(item().id)"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .item-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      min-height: 2.75rem;
    }

    .item-row__content {
      flex: 1;
      min-width: 0;
    }

    .item-row__name {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-row__ai-indicator {
      color: var(--mat-sys-tertiary);
      font-size: 0.75rem;
      margin-left: 0.25rem;
      cursor: pointer;
    }

    .item-row__description {
      display: block;
      font-size: 0.875rem;
      font-style: italic;
      color: var(--mat-sys-on-surface-variant);
    }

    .item-row__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .item-row__qty {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .item-row__price {
      font-size: 0.75rem;
      color: var(--mat-sys-outline);
    }

    .item-row__remove {
      flex-shrink: 0;
      min-height: 2.75rem;
      min-width: 2.75rem;
    }
  `],
})
export class ItemRowComponent {
  readonly item = input.required<Item>();
  readonly removed = output<ItemId>();

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
}
