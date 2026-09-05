import { Injectable, inject, signal } from '@angular/core';
import { ItemApiService } from './item-api.service';
import type { AutocompleteItem } from '../../models/autocomplete.model';

@Injectable({ providedIn: 'root' })
export class AutocompleteService {
  private readonly itemApi = inject(ItemApiService);

  private readonly cache = signal<AutocompleteItem[] | null>(null);
  private pending: Promise<AutocompleteItem[]> | null = null;

  async ensureLoaded(): Promise<AutocompleteItem[]> {
    const current = this.cache();
    if (current) {
      return current;
    }
    if (!this.pending) {
      this.pending = this.itemApi.fetchAutocompleteItems().then((items) => {
        this.cache.set(items);
        return items;
      });
    }
    return this.pending;
  }

  /** Omit `limit` to get every match — the full set is already cached client-side. */
  suggest(query: string, limit?: number): AutocompleteItem[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    const all = this.cache() ?? [];
    const byName = new Map<string, AutocompleteItem>();
    for (const item of all) {
      if (!item.name.toLowerCase().includes(trimmed)) {
        continue;
      }
      const key = item.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing || item.purchaseCount > existing.purchaseCount) {
        byName.set(key, item);
      }
    }
    const ranked = [...byName.values()].sort(
      (a, b) => b.purchaseCount - a.purchaseCount,
    );
    return limit === undefined ? ranked : ranked.slice(0, limit);
  }
}
