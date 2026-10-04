import { createReducer, on } from '@ngrx/store';
import { uiActions } from './ui.actions';
import { accountActions } from '../account/account.actions';
import { shopsActions } from '../shops/shops.actions';
import type { ShopId } from '../../models/ids.model';

export interface UiState {
  mode: 'plan' | 'shop';
  selectedShopId: ShopId | null;
  navDrawerOpen: boolean;
}

export const initialUiState: UiState = {
  mode: 'plan',
  selectedShopId: null,
  navDrawerOpen: false,
};

export const uiReducer = createReducer(
  initialUiState,

  on(uiActions.switchToPlanMode, (state) => ({
    ...state,
    mode: 'plan' as const,
  })),

  on(uiActions.switchToShopModeWithShop, (state, { shopId }) => ({
    ...state,
    mode: 'shop' as const,
    selectedShopId: shopId,
    navDrawerOpen: false,
  })),

  on(uiActions.navDrawerOpened, (state) => ({
    ...state,
    navDrawerOpen: true,
  })),

  on(uiActions.navDrawerClosed, (state) => ({
    ...state,
    navDrawerOpen: false,
  })),

  on(uiActions.planModeShopSelected, (state, { shopId }) => ({
    ...state,
    selectedShopId: shopId,
  })),

  on(accountActions.accountLoaded, (state, { selectedShopId }) => ({
    ...state,
    selectedShopId,
  })),

  on(shopsActions.shopDeleted, (state, { id }) =>
    state.selectedShopId === id
      ? { ...state, selectedShopId: null }
      : state,
  ),

  on(shopsActions.shopChangesReceived, (state, { removed }) =>
    state.selectedShopId && removed.includes(state.selectedShopId)
      ? { ...state, selectedShopId: null }
      : state,
  ),
);
