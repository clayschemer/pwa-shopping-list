import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSelect, MatOption } from '@angular/material/select';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { selectOrderedCategoriesForShop } from '../../store/derived/list.selectors';
import { selectSelectedShopId } from '../../store/ui/ui.selectors';
import { uiActions } from '../../store/ui/ui.actions';
import { categoriesActions } from '../../store/categories/categories.actions';
import { switchMap } from 'rxjs';
import type { ShopId } from '../../models/ids.model';

/**
 * Navigation drawer — rendered inside mat-sidenav.
 * Shows shop layout selector, category list with reorder handles,
 * "Add category" row, and "Manage shops…" link.
 */
@Component({
  selector: 'app-nav-drawer',
  standalone: true,
  imports: [
    RouterLink,
    MatList,
    MatListItem,
    MatIconButton,
    MatIcon,
    MatSelect,
    MatOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nav-drawer">
      <!-- Shop layout selector -->
      <div class="nav-drawer__shop-select">
        <label class="nav-drawer__label" for="shop-select">Current shop layout</label>
        <mat-select
          id="shop-select"
          [value]="selectedShopId()"
          (selectionChange)="onShopChange($event.value)"
          aria-label="Current shop layout"
        >
          <mat-option [value]="null">Global (all)</mat-option>
          @for (shop of shops(); track shop.id) {
            <mat-option [value]="shop.id">{{ shop.name }}</mat-option>
          }
        </mat-select>
        <a
          class="nav-drawer__manage-shops"
          routerLink="/settings/shops"
          (click)="close.emit()"
        >
          Manage shops…
        </a>
      </div>

      <hr class="nav-drawer__divider" />

      <!-- Category list -->
      <ul class="nav-drawer__categories" role="list">
        @for (category of orderedCategories(); track category.id) {
          <li class="nav-drawer__category-row" role="listitem">
            <span class="nav-drawer__category-name">{{ category.name }}</span>
            <mat-icon class="nav-drawer__drag-handle" aria-hidden="true">drag_indicator</mat-icon>
          </li>
        }

        <!-- Add category -->
        <li class="nav-drawer__add-category" role="listitem">
          <button
            class="nav-drawer__add-category-btn"
            (click)="addCategory()"
          >
            <mat-icon aria-hidden="true">add</mat-icon>
            Add category
          </button>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .nav-drawer {
      width: 18rem;
      padding: 1rem 0;
    }

    .nav-drawer__shop-select {
      padding: 0 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .nav-drawer__label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
    }

    .nav-drawer__manage-shops {
      font-size: 0.875rem;
      color: var(--mat-sys-primary);
      text-decoration: none;
      padding: 0.25rem 0;
    }

    .nav-drawer__divider {
      border: none;
      border-top: 1px solid var(--mat-sys-outline-variant);
      margin: 0.75rem 0;
    }

    .nav-drawer__categories {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-drawer__category-row {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      cursor: pointer;

      &:hover {
        background: var(--mat-sys-surface-variant);
      }
    }

    .nav-drawer__category-name {
      flex: 1;
      font-size: 1rem;
    }

    .nav-drawer__drag-handle {
      color: var(--mat-sys-outline);
      cursor: grab;
    }

    .nav-drawer__add-category-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      width: 100%;
      background: none;
      border: none;
      font-size: 1rem;
      color: var(--mat-sys-primary);
      cursor: pointer;
      text-align: left;
    }
  `],
})
export class NavDrawerComponent {
  private readonly store = inject(Store);

  readonly close = output<void>();

  readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
  });

  readonly selectedShopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null,
  });

  readonly orderedCategories = toSignal(
    this.store.select(selectSelectedShopId).pipe(
      switchMap((shopId) =>
        this.store.select(selectOrderedCategoriesForShop(shopId)),
      ),
    ),
    { initialValue: [] },
  );

  onShopChange(shopId: ShopId | null): void {
    // Changing shop layout in plan mode just reorders categories — does not switch to shop mode
    this.store.dispatch(uiActions.switchToShopModeWithShop({ shopId }));
  }

  addCategory(): void {
    // TODO: open add category bottom sheet
    const name = prompt('Category name:');
    if (name?.trim()) {
      this.store.dispatch(categoriesActions.addCategoryRequested({ name: name.trim() }));
    }
  }
}
