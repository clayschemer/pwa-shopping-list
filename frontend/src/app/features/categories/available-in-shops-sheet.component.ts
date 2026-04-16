import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CategoryId, ShopId } from '../../models/ids.model';

export interface AvailableInShopsData {
  categoryId: CategoryId;
  categoryName: string;
  shops: { id: ShopId; name: string; includes: boolean }[];
}

export interface AvailableInShopsResult {
  added: ShopId[];
  removed: ShopId[];
}

@Component({
  selector: 'app-available-in-shops-sheet',
  imports: [MatCheckbox, MatButton, TranslocoPipe],
  templateUrl: './available-in-shops-sheet.component.html',
  styleUrl: './available-in-shops-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailableInShopsSheetComponent {
  private readonly sheetRef = inject(
    MatBottomSheetRef<AvailableInShopsSheetComponent>,
  );
  readonly data = inject<AvailableInShopsData>(MAT_BOTTOM_SHEET_DATA);

  private readonly initial = new Map(
    this.data.shops.map((s) => [s.id, s.includes]),
  );

  private readonly current = signal(new Map(this.initial));

  readonly rows = computed(() => {
    const state = this.current();
    return this.data.shops.map((s) => ({
      id: s.id,
      name: s.name,
      includes: state.get(s.id) ?? false,
    }));
  });

  toggle(shopId: ShopId, checked: boolean): void {
    const next = new Map(this.current());
    next.set(shopId, checked);
    this.current.set(next);
  }

  onDone(): void {
    const added: ShopId[] = [];
    const removed: ShopId[] = [];
    for (const [id, includes] of this.current()) {
      if (includes && !this.initial.get(id)) added.push(id);
      if (!includes && this.initial.get(id)) removed.push(id);
    }
    this.sheetRef.dismiss({ added, removed } satisfies AvailableInShopsResult);
  }
}
