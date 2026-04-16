import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Session } from '../../models/session.model';
import type { SessionId, ShopId } from '../../models/ids.model';

export const sessionsActions = createActionGroup({
  source: 'Sessions',
  events: {
    'Sessions Loaded': props<{ sessions: Session[] }>(),
    'Session Started': props<{ session: Session }>(),
    'Session Start Conflict': emptyProps(),
    'Session Joined': props<{ session: Session }>(),
    'Session Closed': props<{ id: SessionId }>(),
    'Session Updated': props<{ session: Session }>(),
    'Session Changes Received': props<{
      sessions: Session[];
      removed: SessionId[];
    }>(),
  },
});

export const sessionsApiActions = createActionGroup({
  source: 'Sessions API',
  events: {
    'Fetch Active Sessions Requested': emptyProps(),
    'Start Session Requested': props<{ shopId: ShopId | null }>(),
    'Join Session Requested': props<{ sessionId: SessionId }>(),
    'Close Session Requested': props<{ sessionId: SessionId }>(),
  },
});
