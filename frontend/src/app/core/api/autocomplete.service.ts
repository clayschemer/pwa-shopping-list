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

  suggest(query: string, limit = 3): AutocompleteItem[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    const all = this.cache() ?? [];
    return all
      .filter((item) => item.name.toLowerCase().includes(trimmed))
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, limit);
  }
}
