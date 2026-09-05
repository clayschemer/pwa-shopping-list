import { describe, it, expect } from 'vitest';
import { itemsReducer, initialItemsState } from './items.reducer';
import { itemsActions, itemsApiActions } from './items.actions';
import type { Item } from '../../models/item.model';
import type { AccountId, CategoryId, ItemId, SessionId } from '../../models/ids.model';

const item = (id: string, name: string, removed = false): Item => ({
  id: id as ItemId,
  accountId: 'a1' as AccountId,
  name,
  description: null,
  quantity: null,
  unit: null,
  primaryCategoryId: null,
  secondaryCategoryIds: [] as CategoryId[],
  removed,
  removedAt: removed ? 1 : null,
  addedBy: 'user',
  aiMotivation: null,
  price: null,
  priceQuantity: null,
  priceUnit: null,
  priceUpdatedAt: null,
  sizePerPieceQuantity: null,
  sizePerPieceUnit: null,
  purchaseCount: 0,
});

describe('itemsReducer', () => {
  it('has empty initial state', () => {
    const state = itemsReducer(undefined, { type: '@@INIT' } as never);
    expect(state.ids).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it('populates entities on itemsLoaded', () => {
    const items = [item('i1', 'Milk'), item('i2', 'Bread')];
    const state = itemsReducer(
      initialItemsState,
      itemsActions.itemsLoaded({ items }),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.loaded).toBe(true);
    // sortComparer: alphabetical
    expect(state.ids).toEqual(['i2', 'i1']);
  });

  it('inserts on itemAdded', () => {
    const state = itemsReducer(
      initialItemsState,
      itemsActions.itemAdded({ item: item('i1', 'Apples') }),
    );
    expect(state.ids).toContain('i1');
  });

  it('upserts on itemUpdated', () => {
    const loaded = itemsReducer(
      initialItemsState,
      itemsActions.itemsLoaded({ items: [item('i1', 'Apples')] }),
    );
    const state = itemsReducer(
      loaded,
      itemsActions.itemUpdated({ item: { ...item('i1', 'Green Apples') } }),
    );
    expect(state.entities['i1']!.name).toBe('Green Apples');
  });

  it('marks removed on itemRemoved without deleting the entity', () => {
    const loaded = itemsReducer(
      initialItemsState,
      itemsActions.itemsLoaded({ items: [item('i1', 'Apples')] }),
    );
    const state = itemsReducer(
      loaded,
      itemsActions.itemRemoved({ id: 'i1' as ItemId }),
    );
    expect(state.entities['i1']!.removed).toBe(true);
    expect(state.entities['i1']!.removedAt).not.toBeNull();
  });

  it('clears removed on itemUnchecked', () => {
    const loaded = itemsReducer(
      initialItemsState,
      itemsActions.itemsLoaded({ items: [item('i1', 'Apples', true)] }),
    );
    const state = itemsReducer(
      loaded,
      itemsActions.itemUnchecked({ id: 'i1' as ItemId }),
    );
    expect(state.entities['i1']!.removed).toBe(false);
    expect(state.entities['i1']!.removedAt).toBeNull();
  });

  // Immediate-check behaviour: the check commits on tap. `pendingChecks`
  // tracks the in-flight write; `recentChecks` keeps the committed item
  // visible for the undo window.
  const checkRequested = () =>
    itemsApiActions.checkItemRequested({
      id: 'i1' as ItemId,
      sessionId: 's1' as SessionId,
    });

  it('records an in-flight check on checkItemRequested', () => {
    const state = itemsReducer(initialItemsState, checkRequested());
    expect(state.pendingChecks['i1' as ItemId]).toBeDefined();
  });

  it('rolls back the in-flight check on itemCheckFailed so the item can be retried', () => {
    const pending = itemsReducer(initialItemsState, checkRequested());
    const state = itemsReducer(
      pending,
      itemsActions.itemCheckFailed({ id: 'i1' as ItemId }),
    );
    expect(state.pendingChecks['i1' as ItemId]).toBeUndefined();
  });

  it('moves a committed check from pending into the recent undo window on itemChecked', () => {
    const pending = itemsReducer(initialItemsState, checkRequested());
    const state = itemsReducer(
      pending,
      itemsActions.itemChecked({ item: item('i1', 'Apples', true) }),
    );
    expect(state.pendingChecks['i1' as ItemId]).toBeUndefined();
    expect(state.recentChecks['i1' as ItemId]).toBeDefined();
  });

  it('clears the recent undo window on checkUndoWindowElapsed', () => {
    const pending = itemsReducer(initialItemsState, checkRequested());
    const checked = itemsReducer(
      pending,
      itemsActions.itemChecked({ item: item('i1', 'Apples', true) }),
    );
    const state = itemsReducer(
      checked,
      itemsActions.checkUndoWindowElapsed({ id: 'i1' as ItemId }),
    );
    expect(state.recentChecks['i1' as ItemId]).toBeUndefined();
  });

  it('clears the recent undo window when the item is unchecked', () => {
    const pending = itemsReducer(initialItemsState, checkRequested());
    const checked = itemsReducer(
      pending,
      itemsActions.itemChecked({ item: item('i1', 'Apples', true) }),
    );
    const state = itemsReducer(
      checked,
      itemsActions.itemUnchecked({ id: 'i1' as ItemId }),
    );
    expect(state.recentChecks['i1' as ItemId]).toBeUndefined();
    expect(state.entities['i1']!.removed).toBe(false);
  });

  it('applies itemChangesReceived with added + removed', () => {
    const loaded = itemsReducer(
      initialItemsState,
      itemsActions.itemsLoaded({ items: [item('i1', 'Apples')] }),
    );
    const state = itemsReducer(
      loaded,
      itemsActions.itemChangesReceived({
        items: [item('i2', 'Bread')],
        removed: ['i1' as ItemId],
      }),
    );
    expect(state.ids).toEqual(['i2']);
  });
});
