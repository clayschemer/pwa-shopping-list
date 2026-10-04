import '../../../testing/init-testbed';
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ShopComponent } from './shop.component';
import { selectGroupedShopList } from '../../store/selectors/grouped-shop-list.selectors';
import { selectListDataLoaded } from '../../store/selectors/list-data-loaded.selectors';
import { selectActiveSessionForCurrentShop } from '../../store/sessions/sessions.selectors';
import { selectPendingChecks, selectRecentChecks } from '../../store/items/items.selectors';
import { selectAllShops } from '../../store/shops/shops.selectors';
import { selectCategoryEntities } from '../../store/categories/categories.selectors';
import { itemsApiActions } from '../../store/items/items.actions';
import { HapticsService } from '../../core/haptics/haptics.service';
import type { Item } from '../../models/item.model';
import type { Session } from '../../models/session.model';
import type {
  AccountId,
  CategoryId,
  ItemId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';

const item = (id: string, name: string): Item =>
  ({
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
  }) as unknown as Item;

const session = (checkedItemIds: string[]): Session =>
  ({
    id: 's-1' as SessionId,
    accountId: 'a1' as AccountId,
    shopId: 'shop-1' as ShopId,
    participants: ['u1' as UserId],
    startedBy: 'u1' as UserId,
    startedAt: 1,
    completedAt: null,
    checkedItems: checkedItemIds.map((id) => ({
      itemId: id as ItemId,
      checkedBy: 'u1' as UserId,
      checkedAt: 1,
      priceSnapshot: null,
      priceQuantitySnapshot: null,
      priceUnitSnapshot: null,
    })),
  }) as unknown as Session;

describe('ShopComponent — undo within the check window', () => {
  let store: MockStore;
  let dispatch: ReturnType<typeof vi.spyOn>;

  const milk = item('i1', 'Milk');

  /**
   * Renders the state the user is looking at immediately after checking an
   * item: the check has committed (it is in the session log), the undo window
   * is still open (recentChecks holds it), so the row is still listed, greyed,
   * and showing the "tap to undo" hint.
   */
  function setup() {
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
                  categoryColor: '#2196F3',
                  items: [milk],
                  estTotal: 0,
                  sessionCheckedTotal: 0,
                },
              ],
            },
            { selector: selectActiveSessionForCurrentShop, value: session(['i1']) },
            { selector: selectPendingChecks, value: {} },
            { selector: selectRecentChecks, value: { i1: 1 } },
            { selector: selectAllShops, value: [] },
            { selector: selectCategoryEntities, value: {} },
          ],
        }),
        { provide: HapticsService, useValue: { checkConfirm: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    });

    store = TestBed.inject(MockStore);
    dispatch = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(ShopComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the undo hint on a just-checked row', () => {
    const fixture = setup();
    const label = fixture.nativeElement.querySelector('.app-shop__item-undo');
    expect(label?.textContent?.trim()).toBe('tap to undo');
  });

  it('undoes the check when the undo affordance is activated', () => {
    const fixture = setup();

    const undoTarget = fixture.nativeElement.querySelector(
      '.app-shop__item-undo',
    ) as HTMLElement;
    undoTarget.click();
    fixture.detectChanges();

    expect(dispatch).toHaveBeenCalledWith(
      itemsApiActions.uncheckItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's-1' as SessionId,
      }),
    );
  });

  it('undoes the check when the row checkbox is activated', () => {
    const fixture = setup();

    const checkbox = fixture.nativeElement.querySelector(
      '.app-shop__item-check',
    ) as HTMLElement;
    checkbox.click();
    fixture.detectChanges();

    expect(dispatch).toHaveBeenCalledWith(
      itemsApiActions.uncheckItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's-1' as SessionId,
      }),
    );
  });
});

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

/** The rule's own declarations, with nested rules stripped out. */
function ownDeclarations(selector: string): string {
  return block(selector).replace(/&[^{]*\{[^}]*\}/gs, '');
}

/** The innermost rules of a block, as selector → declarations pairs. */
function nestedRules(body: string): { selector: string; declarations: string }[] {
  return [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].trim(),
    declarations: match[2],
  }));
}

/**
 * Component styles are not compiled into the jsdom test environment, so the
 * row's height cannot be measured here. These assert the source declarations
 * that decide it instead: the undo affordance replaces the price inside the
 * meta row, so anything that makes its box taller than the price button's makes
 * the row jump the moment an item is checked.
 */
describe('ShopComponent — undo hint keeps the row height stable', () => {
  it('does not reserve vertical space on the undo affordance', () => {
    expect(ownDeclarations('&__item-undo')).not.toMatch(/(min-)?height:/);
  });

  it('keeps a full-height tap target via an overlay that costs no layout space', () => {
    const overlay = block('&__item-undo').match(/&::after \{(.*?)\}/s)?.[1] ?? '';

    expect(overlay).toContain('position: absolute');
    expect(overlay).toContain('block-size: var(--app-spacing-row-min-height)');
  });
});

/**
 * Left-handed mode is CSS-only and jsdom compiles no component styles, so the
 * checkbox's side cannot be measured here. What decides it is which element the
 * mirror lands on: the row is a grid (&__item, animating its own height) wrapping
 * a flex line (&__item-collapse, laying name and checkbox out side by side).
 * Flex properties on the grid are inert — that is exactly how this regressed —
 * so these assert the mirror acts inside the flex context, whether it reverses
 * the container or reorders its children.
 */
describe('ShopComponent — left-handed mode moves the checkbox to the leading edge', () => {
  /** The class whose rule owns `display: flex` for the row. */
  const flexRow = '&__item-collapse';
  const flexRowClass = flexRow.replace('&', '.app-shop');
  const rules = nestedRules(block(':host-context(body.theme-left-handed)'));

  it('lays the row out as a flex line, so the mirror has something to act on', () => {
    expect(ownDeclarations(flexRow)).toMatch(/display:\s*flex/);
  });

  it('mirrors the row, by reversing the flex line or reordering its children', () => {
    const reversesTheLine = rules.some(
      (rule) =>
        rule.selector === flexRowClass &&
        /flex-direction:\s*row-reverse/.test(rule.declarations),
    );
    const reordersTheChildren = rules.some(
      (rule) =>
        /^\.app-shop__item-(check|main)$/.test(rule.selector) &&
        /\border:\s*-?\d/.test(rule.declarations),
    );

    expect(
      reversesTheLine || reordersTheChildren,
      `nothing in the left-handed rule mirrors ${flexRowClass}`,
    ).toBe(true);
  });

  it('never spends a flex property on an element that is not a flex container', () => {
    for (const rule of rules) {
      if (!/flex-direction:/.test(rule.declarations)) continue;

      expect(
        ownDeclarations(rule.selector.replace('.app-shop', '&')),
        `${rule.selector} is not a flex container, so flex-direction does nothing`,
      ).toMatch(/display:\s*flex/);
    }
  });
});
