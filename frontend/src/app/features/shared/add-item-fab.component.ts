import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFabButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';

const UNIT_OPTIONS = [
  'pcs', 'g', 'kg', 'mg', 'ml', 'L', 'cl',
  'bag', 'pack', 'box', 'can', 'bottle', 'jar', 'carton',
  'bunch', 'head', 'loaf', 'slice', 'sheet',
  'tsp', 'tbsp', 'cup', 'oz', 'lb',
];

export interface AddItemRequest {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/**
 * FAB that morphs into an inline add-item input.
 * Presentational — emits add requests, parent handles the API call.
 */
@Component({
  selector: 'app-add-item-fab',
  standalone: true,
  imports: [
    FormsModule,
    MatFabButton,
    MatButton,
    MatIcon,
    MatFormField,
    MatInput,
    MatLabel,
    MatSelect,
    MatOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!expanded()) {
      <button
        mat-fab
        class="add-item-fab"
        aria-label="Add item"
        (click)="open()"
      >
        <mat-icon>add</mat-icon>
      </button>
    } @else {
      <div class="add-item-pill" (clickOutside)="close()">
        @if (nameConfirmed()) {
          <span class="add-item-pill__name-badge">{{ name() }}</span>
          <input
            #qtyInput
            class="add-item-pill__qty"
            type="number"
            placeholder="Qty"
            min="0"
            step="any"
            aria-label="Quantity"
            [(ngModel)]="quantityStr"
          />
          <select
            class="add-item-pill__unit"
            aria-label="Unit"
            [(ngModel)]="unit"
          >
            <option value="">—</option>
            @for (u of units; track u) {
              <option [value]="u">{{ u }}</option>
            }
          </select>
          <button
            mat-flat-button
            class="add-item-pill__add-btn"
            (click)="submitAdd()"
          >
            Add
          </button>
        } @else {
          <input
            #nameInput
            class="add-item-pill__name-input"
            type="text"
            placeholder="Item name…"
            aria-label="Item name"
            [(ngModel)]="nameValue"
            (keydown.enter)="confirmName()"
          />
          @if (conflictError()) {
            <span class="add-item-pill__error" role="alert">
              Already on list
            </span>
          }
          @if (canConfirmName()) {
            <button
              mat-flat-button
              class="add-item-pill__ok-btn"
              (click)="confirmName()"
            >
              OK
            </button>
          }
        }
        <button
          mat-icon-button
          class="add-item-pill__close"
          aria-label="Cancel"
          (click)="close()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 100;
    }

    .add-item-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--mat-sys-surface-container-high);
      border-radius: 2rem;
      padding: 0.5rem 0.75rem;
      box-shadow: var(--mat-sys-elevation-4);
      min-width: 16rem;
      max-width: calc(100vw - 3rem);
    }

    .add-item-pill__name-input,
    .add-item-pill__qty {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      outline: none;
      min-width: 0;
      color: var(--mat-sys-on-surface);
    }

    .add-item-pill__qty {
      max-width: 5rem;
    }

    .add-item-pill__unit {
      border: none;
      background: transparent;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface);
      cursor: pointer;
    }

    .add-item-pill__name-badge {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      border-radius: 1rem;
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
      white-space: nowrap;
      max-width: 10rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .add-item-pill__error {
      color: var(--mat-sys-error);
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .add-item-pill__ok-btn {
      background-color: var(--mat-sys-tertiary);
      color: var(--mat-sys-on-tertiary);
      border-radius: 1rem;
    }

    .add-item-pill__add-btn {
      background-color: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      border-radius: 1rem;
    }
  `],
})
export class AddItemFabComponent {
  readonly addRequested = output<AddItemRequest>();
  readonly units = UNIT_OPTIONS;

  readonly expanded = signal(false);
  readonly nameConfirmed = signal(false);
  readonly conflictError = signal(false);

  nameValue = '';
  quantityStr = '';
  unit = '';

  readonly name = computed(() => this.nameValue.trim());
  readonly canConfirmName = computed(() => this.name().length > 1);

  open(): void {
    this.expanded.set(true);
    this.nameConfirmed.set(false);
    this.conflictError.set(false);
    this.nameValue = '';
    this.quantityStr = '';
    this.unit = '';
  }

  close(): void {
    this.expanded.set(false);
    this.nameConfirmed.set(false);
  }

  confirmName(): void {
    if (!this.canConfirmName()) return;
    this.nameConfirmed.set(true);
    this.conflictError.set(false);
  }

  submitAdd(): void {
    const qty = this.quantityStr ? parseFloat(this.quantityStr) : null;
    const unit = this.unit || null;
    this.addRequested.emit({
      name: this.name(),
      quantity: Number.isFinite(qty!) ? qty : null,
      unit,
    });
    this.close();
  }

  /** Called by parent to signal a name conflict after the API returns. */
  showConflict(): void {
    this.nameConfirmed.set(false);
    this.conflictError.set(true);
  }
}
