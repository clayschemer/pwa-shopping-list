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
import { MatFabButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { AutocompleteService } from '../../core/api/autocomplete.service';
import { getSelectableUnits } from './item-units';
import { ThemeService } from '../../core/theme/theme.service';
import type { AutocompleteItem } from '../../models/autocomplete.model';
import type { CategoryId } from '../../models/ids.model';

export interface AddItemRequest {
  name: string;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
}

type Stage = 'collapsed' | 'name' | 'qty';

@Component({
  selector: 'app-add-item-pill',
  imports: [FormsModule, MatIcon, MatFabButton, TranslocoPipe],
  templateUrl: './add-item-pill.component.html',
  styleUrl: './add-item-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddItemPillComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly autocomplete = inject(AutocompleteService);
  private readonly theme = inject(ThemeService);

  readonly existingNames = input.required<string[]>();
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

  readonly hasConflict = computed(() => {
    const trimmed = this.name().trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    return this.existingNames().some((n) => n.toLowerCase() === trimmed);
  });

  readonly nameValid = computed(
    () => this.name().trim().length > 1 && !this.hasConflict(),
  );

  readonly suggestions = computed<AutocompleteItem[]>(() => {
    this.suggestionsVersion();
    const query = this.name();
    if (this.stage() !== 'name' || query.trim().length === 0) {
      return [];
    }
    return this.autocomplete.suggest(query, 3);
  });

  constructor() {
    effect(() => {
      const s = this.stage();
      queueMicrotask(() => {
        if (s === 'name') {
          this.nameInput?.nativeElement.focus();
        } else if (s === 'qty') {
          this.qtyInput?.nativeElement.focus();
        }
      });
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

  applySuggestion(suggestion: AutocompleteItem): void {
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
