import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ItemId, SessionId, ShopId } from '../../models/ids.model';

export const uiActions = createActionGroup({
  source: 'UI',
  events: {
    'Switch To Plan Mode': emptyProps(),
    'Switch To Shop Mode With Shop': props<{ shopId: ShopId | null }>(),
    'Check Undo Pending': props<{ itemId: ItemId; sessionId: SessionId }>(),
    'Check Undo Expired': emptyProps(),
    'Check Undo Cancelled': emptyProps(),
    'Dismiss Session Conflict': emptyProps(),
    'Show Inactive Session Reminder': emptyProps(),
    'Dismiss Inactive Session Reminder': emptyProps(),
  },
});
