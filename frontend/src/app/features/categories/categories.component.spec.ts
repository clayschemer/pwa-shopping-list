import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, of } from 'rxjs';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { CategoriesComponent } from './categories.component';
import { categoriesReducer } from '../../store/categories/categories.reducer';
import { categoryGroupsReducer } from '../../store/category-groups/category-groups.reducer';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { accountReducer } from '../../store/account/account.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { categoriesActions, categoriesApiActions } from '../../store/categories/categories.actions';
import { categoryGroupsActions } from '../../store/category-groups/category-groups.actions';
import { shopsActions, shopsApiActions } from '../../store/shops/shops.actions';
import type { Category } from '../../models/category.model';
import type { CategoryGroup } from '../../models/category-group.model';
import type { Shop } from '../../models/shop.model';
import type {
  AccountId,
  CategoryGroupId,
  CategoryId,
  ShopId,
} from '../../models/ids.model';

const A = 'a1' as AccountId;
const G_GROCERY = 'g1' as CategoryGroupId;
const G_FURNITURE = 'g2' as CategoryGroupId;

const cat = (
  id: string,
  name: string,
  order: number,
  groupIds: CategoryGroupId[] = [],
): Category => ({
  id: id as CategoryId,
  accountId: A,
  name,
  color: null,
  globalSortOrder: order,
  groupIds,
});

const groups: CategoryGroup[] = [
  { id: G_GROCERY, accountId: A, name: 'Grocery' },
  { id: G_FURNITURE, accountId: A, name: 'Furniture' },
];

const categories: Category[] = [
  cat('c1', 'Produce', 0, [G_GROCERY]),
  cat('c2', 'Dairy', 1),
  cat('c3', 'Sofas', 2, [G_FURNITURE]),
];

/** Tesco excludes Sofas — the exclusion the drag handler used to silently undo. */
const shops: Shop[] = [
  {
    id: 's1' as ShopId,
    accountId: A,
    name: 'Tesco',
    categoryOrder: ['c1', 'c2'] as CategoryId[],
    priceSearchUrl: null,
  },
];

describe('CategoriesComponent', () => {
  let fixture: ComponentFixture<CategoriesComponent>;
  let component: CategoriesComponent;
  let store: Store;
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  let bottomSheet: { open: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    bottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => EMPTY }) };
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => EMPTY }) };

    await TestBed.configureTestingModule({
      imports: [CategoriesComponent, provideTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideStore({
          categories: categoriesReducer,
          categoryGroups: categoryGroupsReducer,
          shops: shopsReducer,
          account: accountReducer,
          ui: uiReducer,
        }),
        { provide: MatBottomSheet, useValue: bottomSheet },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    store.dispatch(categoriesActions.categoriesLoaded({ categories }));
    store.dispatch(categoryGroupsActions.categoryGroupsLoaded({ groups }));
    store.dispatch(shopsActions.shopsLoaded({ shops }));

    fixture = TestBed.createComponent(CategoriesComponent);
    component = fixture.componentInstance;
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement;

  describe('group chips', () => {
    it('renders one chip per group, ordered by name', () => {
      const chips = Array.from(
        el().querySelectorAll('.app-categories__chip:not(.app-categories__chip--add)'),
      ).map((c) => c.textContent?.trim());
      expect(chips).toEqual(['Furniture', 'Grocery']);
    });

    it('always offers a chip for creating a new group', () => {
      expect(el().querySelector('.app-categories__chip--add')).toBeTruthy();
    });

    it('opens the group sheet with tri-state shop availability when a chip is tapped', () => {
      component.openGroupEdit(groups[0]); // Grocery — member c1, in Tesco
      const data = bottomSheet.open.mock.calls[0][1].data;
      expect(data.mode).toBe('edit');
      expect(data.memberCount).toBe(1);
      expect(data.shops).toEqual([{ id: 's1', name: 'Tesco', state: 'all' }]);
    });

    it('reports a group as partially available when only some members are in the shop', () => {
      // Add Sofas (excluded from Tesco) to Grocery so it straddles the shop.
      store.dispatch(
        categoriesActions.categoriesAddedToGroup({
          ids: ['c3' as CategoryId],
          groupId: G_GROCERY,
        }),
      );
      fixture.detectChanges();

      component.openGroupEdit(groups[0]);
      const data = bottomSheet.open.mock.calls.at(-1)![1].data;
      expect(data.shops[0].state).toBe('some');
    });

    it('reports a group with no members as unavailable everywhere', () => {
      component.openGroupEdit({ id: 'g3' as CategoryGroupId, accountId: A, name: 'Empty' });
      const data = bottomSheet.open.mock.calls.at(-1)![1].data;
      expect(data.memberCount).toBe(0);
      expect(data.shops[0].state).toBe('none');
    });
  });

  describe('group sheet results', () => {
    it('adds every member to a shop in one write when a shop is ticked', () => {
      bottomSheet.open.mockReturnValue({
        afterDismissed: () =>
          of({
            kind: 'edit-save',
            name: 'Grocery',
            addedShops: ['s1' as ShopId],
            removedShops: [],
          }),
      });
      // Grocery members: c1 (already in Tesco) and c3 (missing).
      store.dispatch(
        categoriesActions.categoriesAddedToGroup({
          ids: ['c3' as CategoryId],
          groupId: G_GROCERY,
        }),
      );
      fixture.detectChanges();
      dispatchSpy.mockClear();

      component.openGroupEdit(groups[0]);

      const orderCalls = dispatchSpy.mock.calls.filter(
        (c: unknown[]) =>
          (c[0] as { type: string }).type ===
          shopsApiActions.setShopCategoryOrderRequested.type,
      );
      expect(orderCalls).toHaveLength(1);
      expect(orderCalls[0][0]).toEqual(
        shopsApiActions.setShopCategoryOrderRequested({
          shopId: 's1' as ShopId,
          orderedIds: ['c1', 'c2', 'c3'] as CategoryId[],
        }),
      );
    });

    it('removes every member from a shop when a shop is unticked', () => {
      bottomSheet.open.mockReturnValue({
        afterDismissed: () =>
          of({
            kind: 'edit-save',
            name: 'Grocery',
            addedShops: [],
            removedShops: ['s1' as ShopId],
          }),
      });
      dispatchSpy.mockClear();

      component.openGroupEdit(groups[0]);

      expect(dispatchSpy).toHaveBeenCalledWith(
        shopsApiActions.setShopCategoryOrderRequested({
          shopId: 's1' as ShopId,
          orderedIds: ['c2'] as CategoryId[],
        }),
      );
    });

    it('renames the group when the name changed', () => {
      bottomSheet.open.mockReturnValue({
        afterDismissed: () =>
          of({ kind: 'edit-save', name: 'Aisles', addedShops: [], removedShops: [] }),
      });
      dispatchSpy.mockClear();

      component.openGroupEdit(groups[0]);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Aisles' }),
      );
    });

    it('confirms before deleting a group', () => {
      bottomSheet.open.mockReturnValue({
        afterDismissed: () => of({ kind: 'delete' }),
      });
      component.openGroupEdit(groups[0]);
      expect(dialog.open).toHaveBeenCalled();
    });
  });

  describe('selection mode', () => {
    it('is off by default and the list is draggable', () => {
      expect(component.selecting()).toBe(false);
      expect(el().querySelector('.app-categories__selection-bar')).toBeFalsy();
    });

    it('selects and deselects individual categories', () => {
      component.toggleSelectionMode();
      component.toggleSelected('c1' as CategoryId);
      expect(component.selectedIds()).toEqual(new Set(['c1']));
      component.toggleSelected('c1' as CategoryId);
      expect(component.selectedIds().size).toBe(0);
    });

    it('selects every visible category with select all', () => {
      component.toggleSelectionMode();
      component.selectAll();
      expect(component.selectedIds().size).toBe(3);
    });

    it('clears the selection when selection mode is cancelled', () => {
      component.toggleSelectionMode();
      component.selectAll();
      component.toggleSelectionMode();
      expect(component.selecting()).toBe(false);
      expect(component.selectedIds().size).toBe(0);
    });

    it('adds the whole selection to a group in a single dispatch', () => {
      bottomSheet.open.mockReturnValue({ afterDismissed: () => of(G_FURNITURE) });
      component.toggleSelectionMode();
      component.selectAll();
      dispatchSpy.mockClear();

      component.openBulkAddToGroup();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        categoriesApiActions.addCategoriesToGroupRequested({
          ids: ['c1', 'c2', 'c3'] as CategoryId[],
          groupId: G_FURNITURE,
        }),
      );
    });

    it('removes the whole selection from a group in a single dispatch', () => {
      bottomSheet.open.mockReturnValue({ afterDismissed: () => of(G_GROCERY) });
      component.toggleSelectionMode();
      component.toggleSelected('c1' as CategoryId);
      dispatchSpy.mockClear();

      component.openBulkRemoveFromGroup();

      expect(dispatchSpy).toHaveBeenCalledWith(
        categoriesApiActions.removeCategoriesFromGroupRequested({
          ids: ['c1'] as CategoryId[],
          groupId: G_GROCERY,
        }),
      );
    });

    it('leaves selection mode after a bulk action', () => {
      bottomSheet.open.mockReturnValue({ afterDismissed: () => of(G_FURNITURE) });
      component.toggleSelectionMode();
      component.selectAll();
      component.openBulkAddToGroup();
      expect(component.selecting()).toBe(false);
    });

    it('does nothing when the picker is dismissed without a choice', () => {
      bottomSheet.open.mockReturnValue({ afterDismissed: () => of(undefined) });
      component.toggleSelectionMode();
      component.selectAll();
      dispatchSpy.mockClear();

      component.openBulkAddToGroup();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('does not open the edit sheet when a row is tapped in selection mode', () => {
      component.toggleSelectionMode();
      component.onRowClick(categories[0]);
      expect(bottomSheet.open).not.toHaveBeenCalled();
      expect(component.selectedIds().has('c1' as CategoryId)).toBe(true);
    });
  });

  describe('group membership caption', () => {
    it('lists the groups a category belongs to', () => {
      expect(component.groupNamesFor(categories[0])).toBe('Grocery');
    });

    it('is empty for a category in no group', () => {
      expect(component.groupNamesFor(categories[1])).toBe('');
    });
  });

  describe('reordering', () => {
    it('writes the new global order when no shop layout is selected', () => {
      dispatchSpy.mockClear();
      component.onCategoryDrop({ previousIndex: 0, currentIndex: 1 } as never);

      expect(dispatchSpy).toHaveBeenCalledWith(
        categoriesApiActions.setGlobalCategoryOrderRequested({
          orderedIds: ['c2', 'c1', 'c3'] as CategoryId[],
        }),
      );
    });

    // Availability IS membership of Shop.categoryOrder, so a reorder must never
    // widen it — dragging used to silently re-add every excluded category.
    it('does not re-add categories excluded from the selected shop', () => {
      component.onLayoutChange('s1');
      fixture.detectChanges();
      dispatchSpy.mockClear();

      component.onCategoryDrop({ previousIndex: 0, currentIndex: 1 } as never);

      expect(dispatchSpy).toHaveBeenCalledWith(
        shopsApiActions.setShopCategoryOrderRequested({
          shopId: 's1' as ShopId,
          orderedIds: ['c2', 'c1'] as CategoryId[],
        }),
      );
    });
  });
});
