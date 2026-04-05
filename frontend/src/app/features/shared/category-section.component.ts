import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { ItemRowComponent } from './item-row.component';
import type { GroupedListEntry } from '../../store/derived/list.selectors';
import type { ItemId, CategoryId } from '../../models/ids.model';

/**
 * Presentational component for a category section in plan mode.
 * Renders category header + item rows.
 * No store access.
 */
@Component({
  selector: 'app-category-section',
  standalone: true,
  imports: [MatIconButton, MatIcon, MatMenu, MatMenuTrigger, MatMenuItem, ItemRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="category-section">
      <header class="category-section__header">
        <h2 class="category-section__name">
          {{ categoryName() }}
        </h2>
        @if (estimatedTotal() !== null) {
          <span class="category-section__total">{{ estimatedTotalDisplay() }}</span>
        }
        @if (group().category) {
          <button
            mat-icon-button
            class="category-section__menu-btn"
            [matMenuTriggerFor]="categoryMenu"
            aria-label="Category options for {{ group().category!.name }}"
          >
            <mat-icon>more_horiz</mat-icon>
          </button>
          <mat-menu #categoryMenu="matMenu">
            <button mat-menu-item (click)="renameCategory.emit(group().category!.id)">
              <mat-icon>edit</mat-icon>
              Rename
            </button>
            <button mat-menu-item (click)="manageCategoryShops.emit(group().category!.id)">
              <mat-icon>store</mat-icon>
              Available in shops…
            </button>
            <button mat-menu-item (click)="deleteCategory.emit(group().category!.id)">
              <mat-icon>delete</mat-icon>
              Delete category
            </button>
          </mat-menu>
        }
      </header>

      <ul class="category-section__items" role="list">
        @for (item of group().items; track item.id) {
          <li role="listitem">
            <app-item-row
              [item]="item"
              (removed)="itemRemoved.emit($event)"
            />
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .category-section__header {
      display: flex;
      align-items: center;
      padding: 1rem 1rem 0.25rem;
      gap: 0.5rem;
    }

    .category-section__name {
      flex: 1;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }

    .category-section__total {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .category-section__menu-btn {
      width: 2rem;
      height: 2rem;
      line-height: 2rem;
    }

    .category-section__items {
      list-style: none;
      margin: 0;
      padding: 0;
    }
  `],
})
export class CategorySectionComponent {
  readonly group = input.required<GroupedListEntry>();
  readonly itemRemoved = output<ItemId>();
  readonly renameCategory = output<CategoryId>();
  readonly deleteCategory = output<CategoryId>();
  readonly manageCategoryShops = output<CategoryId>();

  readonly categoryName = computed(() =>
    this.group().category?.name ?? 'Uncategorised',
  );

  readonly estimatedTotal = computed(() => {
    const total = this.group().items.reduce(
      (sum, item) => (item.price !== null ? sum + item.price : sum),
      0,
    );
    return this.group().items.some((i) => i.price !== null) ? total : null;
  });

  readonly estimatedTotalDisplay = computed(() => {
    const t = this.estimatedTotal();
    if (t === null) return null;
    return `Est. £${t.toFixed(2)}`;
  });
}
