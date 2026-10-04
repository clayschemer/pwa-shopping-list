import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { AddItemPillComponent, type AddItemRequest } from './add-item-pill.component';
import { ItemApiService } from '../../core/api/item-api.service';
import type { AutocompleteItem } from '../../models/autocomplete.model';
import type { Category } from '../../models/category.model';
import type { AccountId, CategoryId, ItemId } from '../../models/ids.model';

const DAIRY = 'c-dairy' as CategoryId;
const SNACKS = 'c-snacks' as CategoryId;

const categories: Category[] = [
  {
    id: DAIRY,
    accountId: 'a1' as AccountId,
    name: 'Dairy',
    color: '#3366ff',
    globalSortOrder: 0,
    groupIds: [],
  },
  {
    id: SNACKS,
    accountId: 'a1' as AccountId,
    name: 'Snacks',
    color: null,
    globalSortOrder: 1,
    groupIds: [],
  },
];

const ac = (
  name: string,
  purchaseCount: number,
  primaryCategoryId: CategoryId | null = DAIRY,
): AutocompleteItem => ({
  id: `i-${name}` as ItemId,
  name,
  quantity: 2,
  unit: 'L',
  primaryCategoryId,
  purchaseCount,
});

/** Five distinct matches for "milk", ranked highest purchaseCount first. */
const FIVE_MILKS = [
  ac('Milky Way', 10, SNACKS),
  ac('Milkshake', 8),
  ac('Milk', 6),
  ac('Oat milk', 4),
  ac('Milk chocolate', 2, null),
];

describe('AddItemPillComponent', () => {
  let fixture: ComponentFixture<AddItemPillComponent>;
  let component: AddItemPillComponent;
  let el: HTMLElement;
  let fetchAutocompleteItems: ReturnType<typeof vi.fn>;

  const rows = (): HTMLButtonElement[] =>
    Array.from(el.querySelectorAll('.app-add-item-pill__suggestion-btn'));

  const showAllButton = (): HTMLButtonElement | null =>
    el.querySelector('.app-add-item-pill__show-all');

  const setUp = async (
    items: AutocompleteItem[],
    existingNames: string[] = [],
  ): Promise<void> => {
    fetchAutocompleteItems.mockResolvedValue(items);
    fixture.componentRef.setInput('existingNames', existingNames);
    fixture.componentRef.setInput('categories', categories);
    fixture.detectChanges();
    await component.open();
    component.name.set('milk');
    fixture.detectChanges();
  };

  beforeEach(async () => {
    fetchAutocompleteItems = vi.fn().mockResolvedValue([]);
    await TestBed.configureTestingModule({
      imports: [AddItemPillComponent, provideTranslocoTesting()],
      providers: [
        { provide: ItemApiService, useValue: { fetchAutocompleteItems } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddItemPillComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  describe('compact suggestions', () => {
    it('shows at most three suggestions', async () => {
      await setUp(FIVE_MILKS);
      expect(rows()).toHaveLength(3);
    });

    it('hides the show-all action when nothing is truncated', async () => {
      await setUp(FIVE_MILKS.slice(0, 3));
      expect(showAllButton()).toBeNull();
    });

    it('offers show-all with the total match count when results are truncated', async () => {
      await setUp(FIVE_MILKS);
      expect(showAllButton()?.textContent).toContain('5');
    });

    it('still pre-fills and advances to the quantity stage on select', async () => {
      await setUp(FIVE_MILKS);
      component.applySuggestion(FIVE_MILKS[1]);
      fixture.detectChanges();
      expect(component.stage()).toBe('qty');
      expect(component.name()).toBe('Milkshake');
      expect(component.quantity()).toBe(2);
      expect(component.unit()).toBe('L');
    });
  });

  describe('browse stage', () => {
    it('lists every match, closes the keyboard and hides the input', async () => {
      await setUp(FIVE_MILKS);
      const input = el.querySelector<HTMLInputElement>('.app-add-item-pill__input');
      const blur = vi.spyOn(input!, 'blur');

      showAllButton()!.click();
      fixture.detectChanges();

      expect(blur).toHaveBeenCalled();
      expect(component.stage()).toBe('browse');
      expect(el.querySelector('.app-add-item-pill__input')).toBeNull();
      expect(rows()).toHaveLength(5);
    });

    it('keeps the panel scrollable behind a fixed header', async () => {
      await setUp(FIVE_MILKS);
      component.expandAll();
      fixture.detectChanges();
      expect(el.querySelector('.app-add-item-pill__browse-header')).toBeTruthy();
      expect(el.querySelector('.app-add-item-pill__list')).toBeTruthy();
      expect(
        el.querySelector('.app-add-item-pill__suggestions--browsing'),
      ).toBeTruthy();
    });

    it('adds the chosen item directly and closes the pill', async () => {
      await setUp(FIVE_MILKS);
      const emitted: AddItemRequest[] = [];
      component.submitted.subscribe((r) => emitted.push(r));

      component.expandAll();
      fixture.detectChanges();
      rows()[3].click();
      fixture.detectChanges();

      expect(emitted).toEqual([
        { name: 'Oat milk', quantity: 2, unit: 'L', primaryCategoryId: DAIRY },
      ]);
      expect(component.stage()).toBe('collapsed');
    });

    it('marks items already on the list as unselectable', async () => {
      await setUp(FIVE_MILKS, ['oat MILK']);
      const emitted: AddItemRequest[] = [];
      component.submitted.subscribe((r) => emitted.push(r));

      component.expandAll();
      fixture.detectChanges();

      const onListRow = rows()[3];
      expect(onListRow.disabled).toBe(true);
      expect(onListRow.textContent).toContain('Already on list');

      component.addFromBrowse(FIVE_MILKS[3]);
      expect(emitted).toEqual([]);
    });

    it('returns to the name input with the query intact', async () => {
      await setUp(FIVE_MILKS);
      component.expandAll();
      fixture.detectChanges();

      el.querySelector<HTMLButtonElement>('.app-add-item-pill__back')!.click();
      fixture.detectChanges();

      expect(component.stage()).toBe('name');
      expect(component.name()).toBe('milk');
      expect(el.querySelector('.app-add-item-pill__input')).toBeTruthy();
    });
  });

  describe('category chip', () => {
    it('labels each suggestion with its primary category', async () => {
      await setUp(FIVE_MILKS);
      const chips = Array.from(
        el.querySelectorAll('.app-add-item-pill__chip'),
      ).map((c) => c.textContent?.trim());
      expect(chips).toEqual(['Snacks', 'Dairy', 'Dairy']);
    });

    it('renders no chip when the item has no resolvable category', async () => {
      await setUp([ac('Milk chocolate', 2, null), ac('Milk soap', 1, 'gone' as CategoryId)]);
      expect(el.querySelectorAll('.app-add-item-pill__chip')).toHaveLength(0);
    });

    it('shows the previously used quantity and unit alongside the chip', async () => {
      await setUp(FIVE_MILKS);
      const qty = Array.from(
        el.querySelectorAll('.app-add-item-pill__suggestion-qty'),
      ).map((q) => q.textContent?.trim());
      expect(qty).toEqual(['2 L', '2 L', '2 L']);
    });

    it('shows the quantity on its own when the item has no unit', async () => {
      await setUp([{ ...ac('Milk', 5), unit: null }]);
      expect(
        el.querySelector('.app-add-item-pill__suggestion-qty')?.textContent?.trim(),
      ).toBe('2');
    });

    it('shows the unit on its own when the item has no quantity', async () => {
      await setUp([{ ...ac('Milk', 5), quantity: null }]);
      expect(
        el.querySelector('.app-add-item-pill__suggestion-qty')?.textContent?.trim(),
      ).toBe('L');
    });

    it('renders no amount when the item has neither quantity nor unit', async () => {
      await setUp([{ ...ac('Milk', 5), quantity: null, unit: null }]);
      expect(el.querySelector('.app-add-item-pill__suggestion-qty')).toBeNull();
    });

    it('keeps the amount visible on rows already on the list', async () => {
      await setUp(FIVE_MILKS, ['Oat milk']);
      component.expandAll();
      fixture.detectChanges();
      const onListRow = rows()[3];
      expect(onListRow.textContent).toContain('Already on list');
      expect(onListRow.textContent).toContain('2 L');
    });
  });
});
