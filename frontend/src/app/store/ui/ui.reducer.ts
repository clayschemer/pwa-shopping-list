import { createReducer, on } from '@ngrx/store';
import { uiActions } from './ui.actions';
import type { ShopId } from '../../models/ids.model';

export interface UiState {
  mode: 'plan' | 'shop';
  selectedShopId: ShopId | null;
}

export const initialUiState: UiState = {
  mode: 'plan',
  selectedShopId: null,
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
  })),
);
