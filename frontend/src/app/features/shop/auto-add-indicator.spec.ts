import '../../../testing/init-testbed';
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ShopComponent } from './shop.component';
import { AutoAddReasonDialogComponent } from '../plan/auto-add-reason-dialog.component';
import { selectGroupedShopList } from '../../store/selectors/grouped-shop-list.selectors';
import { selectListDataLoaded } from '../../store/selectors/list-data-loaded.selectors';
import { selectActiveSessionForCurrentShop } from '../../store/sessions/sessions.selectors';
import { selectPendingChecks, selectRecentChecks } from '../../store/items/items.selectors';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { selectCategoryEntities } from '../../store/categories/categories.selectors';
import type { Item, AutoAddReason } from '../../models/item.model';
import type { AccountId, CategoryId, ItemId } from '../../models/ids.model';

const PERIODICITY: AutoAddReason = {
  kind: 'periodicity',
  medianIntervalDays: 7,
  daysSinceLastPurchase: 9,
  purchaseCount: 5,
};

function item(id: string, name: string, overrides: Partial<Item> = {}): Item {
  return {
    id: id as ItemId,
    accountId: 'a1' as AccountId,
    name,
    description: null,
    quantity: null,
    unit: null,
    primaryCategoryId: 'c1' as CategoryId,
    secondaryCategoryIds: [],
    removed: false,
    removedAt: null,
    addedBy: 'user',
    autoAddReason: null,
    autoAddedAt: null,
    autoAddDeclinedAt: null,
    autoAddMotivation: null,
    autoAddMotivationLang: null,
    price: null,
    priceQuantity: null,
    priceUnit: null,
    priceShopId: null,
    priceProductName: null,
    priceProductUrl: null,
    priceSearchUrl: null,
    shopPrices: {},
    priceFeedback: [],
    priceUpdatedAt: null,
    priceAttemptedAt: null,
    sizePerPieceQuantity: null,
    sizePerPieceUnit: null,
    purchaseCount: 0,
    ...overrides,
  } as unknown as Item;
}

/**
 * The indicator that tells the user an item arrived on the list without anyone
 * asking for it — and which of the two mechanisms put it there.
 */
describe('auto-add indicator', () => {
  const dialog = { open: vi.fn() };

  function setup(items: Item[]) {
    dialog.open.mockClear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [provideTranslocoTesting()],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectListDataLoaded, value: true },
            {
              selector: selectGroupedShopList,
              value: [
                {
                  categoryId: 'c1' as CategoryId,
                  categoryName: 'Dairy',
                  categoryColor: null,
                  items,
                  estTotal: 0,
                  sessionCheckedTotal: 0,
                },
              ],
            },
            { selector: selectActiveSessionForCurrentShop, value: null },
            { selector: selectPendingChecks, value: {} },
            { selector: selectRecentChecks, value: {} },
            { selector: selectAllShops, value: [] },
            { selector: selectCategoryEntities, value: {} },
          ],
        }),
        { provide: MatDialog, useValue: dialog },
      ],
    });
    const fixture = TestBed.createComponent(ShopComponent);
    fixture.detectChanges();
    return fixture;
  }

  const buttonSelector = '.app-shop__item-autoadd-btn';

  it('is absent on an item a person added', () => {
    const fixture = setup([item('i1', 'Milk')]);

    expect(fixture.nativeElement.querySelector(buttonSelector)).toBeNull();
  });

  it('is present on a rule-driven addition', () => {
    const fixture = setup([
      item('i1', 'Milk', { addedBy: 'auto', autoAddReason: PERIODICITY }),
    ]);

    expect(fixture.nativeElement.querySelector(buttonSelector)).not.toBeNull();
  });

  /**
   * A clock for "this is due again" versus a sparkle for a model's suggestion —
   * the two must never be conflated, because they warrant different amounts of
   * trust from the user.
   */
  it('shows a clock for a rule-driven addition', () => {
    const fixture = setup([
      item('i1', 'Milk', { addedBy: 'auto', autoAddReason: PERIODICITY }),
    ]);

    const icon = fixture.nativeElement.querySelector(`${buttonSelector} mat-icon`);
    expect(icon?.textContent?.trim()).toBe('schedule');
  });

  it('shows a sparkle for a model-driven suggestion', () => {
    const fixture = setup([
      item('i1', 'Milk', { addedBy: 'ai', autoAddReason: PERIODICITY }),
    ]);

    const icon = fixture.nativeElement.querySelector(`${buttonSelector} mat-icon`);
    expect(icon?.textContent?.trim()).toBe('auto_awesome');
  });

  it('names the item in its accessible label', () => {
    const fixture = setup([
      item('i1', 'Milk', { addedBy: 'auto', autoAddReason: PERIODICITY }),
    ]);

    const label = fixture.nativeElement
      .querySelector(buttonSelector)
      ?.getAttribute('aria-label');
    expect(label).toContain('Milk');
  });

  it('opens the reason dialog with the stored reason', () => {
    const fixture = setup([
      item('i1', 'Milk', { addedBy: 'auto', autoAddReason: PERIODICITY }),
    ]);

    fixture.nativeElement.querySelector(buttonSelector).click();

    expect(dialog.open).toHaveBeenCalledOnce();
    const [component, config] = dialog.open.mock.calls[0];
    expect(component).toBe(AutoAddReasonDialogComponent);
    expect(config.data).toEqual({
      itemName: 'Milk',
      reason: PERIODICITY,
      motivation: null,
    });
  });

  /**
   * The indicator sits beside the name, which is inside the element whose own
   * button handles opening the editor in plan mode. Nesting it there would make
   * the whole row's tap target ambiguous, so it has to be a sibling.
   */
  it('is not nested inside the row body', () => {
    const fixture = setup([
      item('i1', 'Milk', { addedBy: 'auto', autoAddReason: PERIODICITY }),
    ]);

    const button = fixture.nativeElement.querySelector(buttonSelector);
    expect(button.closest('button')).toBe(button);
  });
});

/**
 * Component styles are not compiled into jsdom, so the row's height cannot be
 * measured here — a rendered-height comparison would pass on two zeroes. These
 * assert the source declarations that decide it instead: an icon carrying its
 * own line height stretches every row it appears on, which is the fault the undo
 * affordance shipped with once already.
 */
describe('auto-add indicator keeps the row height stable', () => {
  const scss = readFileSync('src/app/features/shop/shop.component.scss', 'utf8');

  /** Returns the body of an SCSS rule, nested rules included. */
  function block(selector: string): string {
    const start = scss.indexOf(`${selector} {`);
    expect(start, `${selector} not found in shop.component.scss`).toBeGreaterThan(-1);
    const open = scss.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < scss.length; i++) {
      if (scss[i] === '{') depth++;
      if (scss[i] === '}' && --depth === 0) return scss.slice(open + 1, i);
    }
    throw new Error(`unterminated block for ${selector}`);
  }

  const body = block('&__item-autoadd-btn');

  it('bounds its own box to the row height rather than growing with content', () => {
    expect(body).toMatch(/height: var\(--app-spacing-row-min-height\)/);
  });

  it('pins the icon to a fixed box', () => {
    const icon = body.match(/mat-icon \{(.*?)\}/s)?.[1] ?? '';

    expect(icon).toMatch(/font-size: var\(--app-font-body\)/);
    expect(icon).toMatch(/height: var\(--app-font-body\)/);
    // Without this the glyph's own line box can exceed the height above.
    expect(icon).toContain('line-height: 1');
  });

  it('does not flex-grow into the row', () => {
    expect(body).toContain('flex: 0 0 auto');
  });
});
