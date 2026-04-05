import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Actions, ofType } from '@ngrx/effects';
import { CategorySectionComponent } from '../shared/category-section.component';
import { AddItemFabComponent, AddItemRequest } from '../shared/add-item-fab.component';
import { selectGroupedPlanList } from '../../store/derived/list.selectors';
import { itemsActions, itemsApiActions } from '../../store/items/items.actions';
import { categoriesActions } from '../../store/categories/categories.actions';
import type { ItemId, CategoryId } from '../../models/ids.model';

/**
 * Plan mode container component.
 * Connects to the store, delegates rendering to presentational sub-components.
 */
@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CategorySectionComponent, AddItemFabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="plan">
      @if (groups().length === 0) {
        <p class="plan__empty">Your list is empty. Tap + to add items.</p>
      }

      @for (group of groups(); track group.category?.id ?? 'uncategorised') {
        <app-category-section
          [group]="group"
          (itemRemoved)="removeItem($event)"
          (renameCategory)="renameCategory($event)"
          (deleteCategory)="deleteCategory($event)"
          (manageCategoryShops)="manageCategoryShops($event)"
        />
      }

      <app-add-item-fab
        #addFab
        (addRequested)="addItem($event)"
      />
    </main>
  `,
  styles: [`
    .plan {
      padding-bottom: 6rem; /* space for fixed FAB */
    }

    .plan__empty {
      padding: 3rem 2rem;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }
  `],
})
export class PlanComponent {
  private readonly store = inject(Store);
  private readonly snackBar = inject(MatSnackBar);
  private readonly actions$ = inject(Actions);

  @ViewChild('addFab') private readonly addFab?: AddItemFabComponent;

  readonly groups = toSignal(this.store.select(selectGroupedPlanList), {
    initialValue: [],
  });

  constructor() {
    // When an add-item attempt produces a name conflict, surface it in the FAB.
    // The FAB remains expanded so the user can change the name.
    this.actions$
      .pipe(
        ofType(itemsApiActions.addItemNameConflict),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.addFab?.showConflict();
      });
  }

  addItem(request: AddItemRequest): void {
    this.store.dispatch(
      itemsActions.addItemRequested({
        name: request.name,
        description: null,
        quantity: request.quantity,
        unit: request.unit,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
      }),
    );
  }

  removeItem(id: ItemId): void {
    this.store.dispatch(itemsActions.removeItemRequested({ id }));
  }

  renameCategory(id: CategoryId): void {
    // TODO: open rename bottom sheet
    this.snackBar.open('Rename category — coming soon', 'OK', { duration: 2000 });
  }

  deleteCategory(id: CategoryId): void {
    // TODO: open confirm dialog — for now dispatch directly
    this.store.dispatch(categoriesActions.deleteCategoryRequested({ id }));
  }

  manageCategoryShops(id: CategoryId): void {
    // TODO: open manage shops sheet
    this.snackBar.open('Available in shops — coming soon', 'OK', { duration: 2000 });
  }
}
