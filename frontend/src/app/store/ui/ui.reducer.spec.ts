import { describe, it, expect } from 'vitest';
import { uiReducer, initialUiState } from './ui.reducer';
import { uiActions } from './ui.actions';
import type { ShopId, ItemId, SessionId } from '../../models/ids.model';

describe('uiReducer', () => {
  it('starts in plan mode with no shop selected', () => {
    const state = uiReducer(undefined, { type: '@@INIT' } as never);
    expect(state.mode).toBe('plan');
    expect(state.selectedShopId).toBeNull();
    expect(state.pendingUndo).toBeNull();
  });

  it('switches to shop mode with selected shop', () => {
    const state = uiReducer(
      undefined,
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    expect(state.mode).toBe('shop');
    expect(state.selectedShopId).toBe('shop-1');
  });

  it('returns to plan mode clearing shop and undo', () => {
    const shopState = uiReducer(
      undefined,
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    const state = uiReducer(shopState, uiActions.switchToPlanMode());
    expect(state.mode).toBe('plan');
    expect(state.selectedShopId).toBeNull();
  });

  it('sets pendingUndo on checkUndoPending', () => {
    const state = uiReducer(
      undefined,
      uiActions.checkUndoPending({
        itemId: 'item-1' as ItemId,
        sessionId: 'sess-1' as SessionId,
      }),
    );
    expect(state.pendingUndo).not.toBeNull();
    expect(state.pendingUndo?.itemId).toBe('item-1');
    expect(state.pendingUndo?.sessionId).toBe('sess-1');
    expect(state.pendingUndo?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('clears pendingUndo on checkUndoExpired', () => {
    const withUndo = uiReducer(
      undefined,
      uiActions.checkUndoPending({
        itemId: 'item-1' as ItemId,
        sessionId: 'sess-1' as SessionId,
      }),
    );
    const state = uiReducer(withUndo, uiActions.checkUndoExpired());
    expect(state.pendingUndo).toBeNull();
  });
});
