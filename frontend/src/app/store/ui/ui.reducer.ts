import { createReducer, on } from '@ngrx/store';
import { uiActions } from './ui.actions';
import type { ItemId, SessionId, ShopId } from '../../models/ids.model';

export interface PendingUndo {
  itemId: ItemId;
  sessionId: SessionId;
  expiresAt: number;
}

export interface UiState {
  mode: 'plan' | 'shop';
  selectedShopId: ShopId | null;
  pendingUndo: PendingUndo | null;
  showInactiveSessionReminder: boolean;
}

export const initialUiState: UiState = {
  mode: 'plan',
  selectedShopId: null,
  pendingUndo: null,
  showInactiveSessionReminder: false,
};

const UNDO_WINDOW_MS = 4000;

export const uiReducer = createReducer(
  initialUiState,

  on(uiActions.switchToPlanMode, (state) => ({
    ...state,
    mode: 'plan' as const,
    selectedShopId: null,
    pendingUndo: null,
  })),

  on(uiActions.switchToShopModeWithShop, (state, { shopId }) => ({
    ...state,
    mode: 'shop' as const,
    selectedShopId: shopId,
  })),

  on(uiActions.checkUndoPending, (state, { itemId, sessionId }) => ({
    ...state,
    pendingUndo: {
      itemId,
      sessionId,
      expiresAt: Date.now() + UNDO_WINDOW_MS,
    },
  })),

  on(uiActions.checkUndoExpired, uiActions.checkUndoCancelled, (state) => ({
    ...state,
    pendingUndo: null,
  })),

  on(uiActions.showInactiveSessionReminder, (state) => ({
    ...state,
    showInactiveSessionReminder: true,
  })),

  on(uiActions.dismissInactiveSessionReminder, (state) => ({
    ...state,
    showInactiveSessionReminder: false,
  })),
);
