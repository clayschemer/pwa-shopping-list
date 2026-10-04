import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatFabButton, MatIconButton } from '@angular/material/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AutocompleteService } from '../../core/api/autocomplete.service';
import { getSelectableUnits } from './item-units';
import { ThemeService } from '../../core/theme/theme.service';
import type { AutocompleteItem } from '../../models/autocomplete.model';
import type { Category } from '../../models/category.model';
import type { CategoryId } from '../../models/ids.model';

export interface AddItemRequest {
  name: string;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
}

type Stage = 'collapsed' | 'name' | 'qty' | 'browse';

/** Suggestions shown before the user asks to see the full match list. */
const COMPACT_SUGGESTION_COUNT = 3;

@Component({
  selector: 'app-add-item-pill',
  imports: [FormsModule, MatIcon, MatFabButton, MatIconButton, TranslocoPipe],
  templateUrl: './add-item-pill.component.html',
  styleUrl: './add-item-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddItemPillComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly autocomplete = inject(AutocompleteService);
  private readonly theme = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);

  readonly existingNames = input.required<string[]>();
  readonly categories = input.required<Category[]>();
  readonly submitted = output<AddItemRequest>();

  readonly stage = signal<Stage>('collapsed');
  readonly name = signal('');
  readonly quantity = signal<number | null>(null);
  readonly unit = signal<string | null>(null);
  private primaryCategoryId: CategoryId | null = null;
  readonly units = computed(() => getSelectableUnits(this.theme.settings().language));

  private readonly suggestionsVersion = signal(0);

  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qtyInput') qtyInput?: ElementRef<HTMLInputElement>;
  @ViewChild('backButton', { read: ElementRef })
  backButton?: ElementRef<HTMLButtonElement>;

  private readonly namesOnList = computed(
    () => new Set(this.existingNames().map((n) => n.toLowerCase())),
  );

  private readonly categoryById = computed(
    () => new Map(this.categories().map((c) => [c.id, c])),
  );

  readonly hasConflict = computed(() => {
    const trimmed = this.name().trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    return this.namesOnList().has(trimmed);
  });

  readonly nameValid = computed(
    () => this.name().trim().length > 1 && !this.hasConflict(),
  );

  /** Every match for the current query, ranked — the browse stage shows all of it. */
  private readonly matches = computed<AutocompleteItem[]>(() => {
    this.suggestionsVersion();
    const stage = this.stage();
    const query = this.name();
    if ((stage !== 'name' && stage !== 'browse') || query.trim().length === 0) {
      return [];
    }
    return this.autocomplete.suggest(query);
  });

  readonly suggestions = computed<AutocompleteItem[]>(() =>
    this.stage() === 'browse'
      ? this.matches()
      : this.matches().slice(0, COMPACT_SUGGESTION_COUNT),
  );

  readonly matchCount = computed(() => this.matches().length);

  readonly canShowAll = computed(
    () => this.stage() === 'name' && this.matchCount() > COMPACT_SUGGESTION_COUNT,
  );

  /** Drives the collapsed panel height in CSS — one row per suggestion, plus the show-all row. */
  readonly rowCount = computed(
    () => this.suggestions().length + (this.canShowAll() ? 1 : 0),
  );

  constructor() {
    effect(() => {
      const s = this.stage();
      queueMicrotask(() => {
        if (s === 'name') {
          this.nameInput?.nativeElement.focus();
        } else if (s === 'qty') {
          this.qtyInput?.nativeElement.focus();
        } else if (s === 'browse') {
          this.backButton?.nativeElement.focus();
        }
      });
    });
  }

  isOnList(name: string): boolean {
    return this.namesOnList().has(name.trim().toLowerCase());
  }

  categoryFor(id: CategoryId | null): Category | null {
    return id === null ? null : this.categoryById().get(id) ?? null;
  }

  /**
   * The previously used amount, e.g. "2 L". Both the order and the separator
   * come from the translation so locales can rewrite them.
   */
  quantityLabel(suggestion: AutocompleteItem): string | null {
    const { quantity, unit } = suggestion;
    const unitLabel = unit ? this.transloco.translate(`units.${unit}`) : null;
    if (quantity === null) {
      return unitLabel;
    }
    if (unitLabel === null) {
      return this.transloco.translate('plan.suggestionQtyOnly', { quantity });
    }
    return this.transloco.translate('plan.suggestionQtyWithUnit', {
      quantity,
      unit: unitLabel,
    });
  }

  async open(): Promise<void> {
    this.resetFields();
    this.stage.set('name');
    await this.autocomplete.ensureLoaded();
    this.suggestionsVersion.update((v) => v + 1);
  }

  close(): void {
    this.stage.set('collapsed');
    this.resetFields();
  }

  confirmName(): void {
    if (!this.nameValid()) {
      return;
    }
    this.stage.set('qty');
  }

  /** Expand to the full match list: dismiss the keyboard, then swap the input out. */
  expandAll(): void {
    this.nameInput?.nativeElement.blur();
    this.stage.set('browse');
  }

  /** Back out of the full list to the name field — the focus effect reopens the keyboard. */
  collapseToInput(): void {
    this.stage.set('name');
  }

  /** In the browse stage a tap is the whole interaction: add the item and close. */
  addFromBrowse(suggestion: AutocompleteItem): void {
    if (this.isOnList(suggestion.name)) {
      return;
    }
    this.submitted.emit({
      name: suggestion.name,
      quantity: suggestion.quantity,
      unit: suggestion.unit,
      primaryCategoryId: suggestion.primaryCategoryId,
    });
    this.close();
  }

  applySuggestion(suggestion: AutocompleteItem): void {
    if (this.isOnList(suggestion.name)) {
      return;
    }
    this.name.set(suggestion.name);
    this.quantity.set(suggestion.quantity);
    this.unit.set(suggestion.unit);
    this.primaryCategoryId = suggestion.primaryCategoryId;
    if (!this.hasConflict()) {
      this.stage.set('qty');
    }
  }

  submit(): void {
    if (this.stage() !== 'qty') {
      return;
    }
    this.submitted.emit({
      name: this.name().trim(),
      quantity: this.quantity() ?? null,
      unit: this.unit(),
      primaryCategoryId: this.primaryCategoryId,
    });
    this.close();
  }

  @HostListener('document:pointerdown', ['$event'])
  onOutsidePointer(event: PointerEvent): void {
    if (this.stage() === 'collapsed') {
      return;
    }
    const root = this.host.nativeElement;
    if (!root.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.stage() !== 'collapsed') {
      this.close();
    }
  }

  private resetFields(): void {
    this.name.set('');
    this.quantity.set(null);
    this.unit.set(null);
    this.primaryCategoryId = null;
  }
}
