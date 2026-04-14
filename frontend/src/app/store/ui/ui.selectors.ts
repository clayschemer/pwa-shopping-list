import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { UiState } from './ui.reducer';

export const selectUiState = createFeatureSelector<UiState>('ui');

export const selectMode = createSelector(selectUiState, (state) => state.mode);

export const selectSelectedShopId = createSelector(
  selectUiState,
  (state) => state.selectedShopId,
);

export const selectIsShopMode = createSelector(
  selectUiState,
  (state) => state.mode === 'shop',
);

export const selectIsPlanMode = createSelector(
  selectUiState,
  (state) => state.mode === 'plan',
);
