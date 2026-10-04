import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AutocompleteService } from './autocomplete.service';
import { ItemApiService } from './item-api.service';
import type { AutocompleteItem } from '../../models/autocomplete.model';
import type { CategoryId, ItemId } from '../../models/ids.model';

const ac = (name: string, purchaseCount: number): AutocompleteItem => ({
  id: `i-${name}` as ItemId,
  name,
  quantity: 1,
  unit: 'pcs',
  primaryCategoryId: null as CategoryId | null,
  purchaseCount,
});

const variant = (
  name: string,
  quantity: number,
  unit: string,
  purchaseCount: number,
): AutocompleteItem => ({
  id: `i-${name}-${quantity}${unit}` as ItemId,
  name,
  quantity,
  unit,
  primaryCategoryId: null as CategoryId | null,
  purchaseCount,
});

describe('AutocompleteService', () => {
  let itemApi: { fetchAutocompleteItems: ReturnType<typeof vi.fn> };
  let service: AutocompleteService;

  beforeEach(() => {
    itemApi = { fetchAutocompleteItems: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: ItemApiService, useValue: itemApi }],
    });
    service = TestBed.inject(AutocompleteService);
  });

  it('fetches once across multiple ensureLoaded calls', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([ac('Milk', 3)]);
    await service.ensureLoaded();
    await service.ensureLoaded();
    expect(itemApi.fetchAutocompleteItems).toHaveBeenCalledTimes(1);
  });

  it('returns empty suggestions for empty query', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([ac('Milk', 3)]);
    await service.ensureLoaded();
    expect(service.suggest('')).toEqual([]);
    expect(service.suggest('   ')).toEqual([]);
  });

  it('returns up to limit suggestions ranked by purchaseCount', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      ac('Milk', 1),
      ac('Milky Way', 10),
      ac('Milkshake', 5),
      ac('Milky Things', 2),
    ]);
    await service.ensureLoaded();
    const result = service.suggest('milk', 3);
    expect(result.map((i) => i.name)).toEqual([
      'Milky Way',
      'Milkshake',
      'Milky Things',
    ]);
  });

  it('returns only the most-purchased variant per distinct name', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      variant('Milk', 1, 'L', 4),
      variant('Milk', 1.5, 'L', 9),
      variant('Milk', 0.5, 'L', 2),
    ]);
    await service.ensureLoaded();
    const result = service.suggest('milk', 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'Milk',
      quantity: 1.5,
      unit: 'L',
      purchaseCount: 9,
    });
  });

  it('dedupes names case-insensitively, keeping the top variant', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      variant('Milk', 1, 'L', 3),
      variant('milk', 2, 'L', 8),
    ]);
    await service.ensureLoaded();
    const result = service.suggest('milk', 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'milk', quantity: 2, purchaseCount: 8 });
  });

  it('keeps distinct names while collapsing same-name variants', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      variant('Milk', 1, 'L', 4),
      variant('Milk', 1.5, 'L', 9),
      variant('Milkshake', 1, 'pcs', 5),
    ]);
    await service.ensureLoaded();
    const result = service.suggest('milk', 3);
    expect(result.map((i) => `${i.name} ${i.quantity}${i.unit}`)).toEqual([
      'Milk 1.5L',
      'Milkshake 1pcs',
    ]);
  });

  it('returns every match ranked by purchaseCount when no limit is given', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      ac('Milk', 1),
      ac('Milky Way', 10),
      ac('Milkshake', 5),
      ac('Milky Things', 2),
      ac('Bread', 7),
    ]);
    await service.ensureLoaded();
    const result = service.suggest('milk');
    expect(result.map((i) => i.name)).toEqual([
      'Milky Way',
      'Milkshake',
      'Milky Things',
      'Milk',
    ]);
  });

  it('still collapses same-name variants when no limit is given', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      variant('Milk', 1, 'L', 4),
      variant('milk', 1.5, 'L', 9),
      variant('Milkshake', 1, 'pcs', 5),
    ]);
    await service.ensureLoaded();
    const result = service.suggest('milk');
    expect(result.map((i) => i.name)).toEqual(['milk', 'Milkshake']);
  });

  it('filters case-insensitively on substring match', async () => {
    itemApi.fetchAutocompleteItems.mockResolvedValue([
      ac('Organic Milk', 1),
      ac('Bread', 1),
    ]);
    await service.ensureLoaded();
    expect(service.suggest('MILK').map((i) => i.name)).toEqual(['Organic Milk']);
  });
});
