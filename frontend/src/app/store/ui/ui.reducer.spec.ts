import { describe, it, expect } from 'vitest';
import { uiReducer, initialUiState } from './ui.reducer';
import { uiActions } from './ui.actions';
import type { ShopId } from '../../models/ids.model';

describe('uiReducer', () => {
  it('starts in plan mode with no shop selected', () => {
    const state = uiReducer(undefined, { type: '@@INIT' } as never);
    expect(state.mode).toBe('plan');
    expect(state.selectedShopId).toBeNull();
  });

  it('switches to shop mode with selected shop', () => {
    const state = uiReducer(
      undefined,
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    expect(state.mode).toBe('shop');
    expect(state.selectedShopId).toBe('shop-1');
  });

  it('returns to plan mode preserving selectedShopId', () => {
    const shopState = uiReducer(
      undefined,
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    const state = uiReducer(shopState, uiActions.switchToPlanMode());
    expect(state.mode).toBe('plan');
    expect(state.selectedShopId).toBe('shop-1');
  });

  it('starts with nav drawer closed', () => {
    const state = uiReducer(undefined, { type: '@@INIT' } as never);
    expect(state.navDrawerOpen).toBe(false);
  });

  it('opens nav drawer on navDrawerOpened', () => {
    const state = uiReducer(undefined, uiActions.navDrawerOpened());
    expect(state.navDrawerOpen).toBe(true);
  });

  it('closes nav drawer on navDrawerClosed', () => {
    const opened = uiReducer(undefined, uiActions.navDrawerOpened());
    const state = uiReducer(opened, uiActions.navDrawerClosed());
    expect(state.navDrawerOpen).toBe(false);
  });

  it('closes nav drawer on switchToShopModeWithShop', () => {
    const opened = uiReducer(undefined, uiActions.navDrawerOpened());
    const state = uiReducer(
      opened,
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    expect(state.navDrawerOpen).toBe(false);
  });

  it('updates selectedShopId on planModeShopSelected without changing mode', () => {
    const state = uiReducer(
      undefined,
      uiActions.planModeShopSelected({ shopId: 'shop-1' as ShopId }),
    );
    expect(state.mode).toBe('plan');
    expect(state.selectedShopId).toBe('shop-1');
  });

  it('allows planModeShopSelected with null for global view', () => {
    const withShop = uiReducer(
      undefined,
      uiActions.planModeShopSelected({ shopId: 'shop-1' as ShopId }),
    );
    const state = uiReducer(
      withShop,
      uiActions.planModeShopSelected({ shopId: null }),
    );
    expect(state.selectedShopId).toBeNull();
  });
});
