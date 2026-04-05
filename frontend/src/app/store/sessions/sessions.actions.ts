import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Session } from '../../models/session.model';
import type { SessionId, ShopId } from '../../models/ids.model';
import type { EntityChange } from '../../core/stream/change-stream.service';

export const sessionsActions = createActionGroup({
  source: 'Sessions',
  events: {
    'Start Session Requested': props<{ shopId: ShopId | null }>(),
    'Join Session Requested': props<{ sessionId: SessionId }>(),
    'Close Session Requested': props<{ sessionId: SessionId }>(),
  },
});

export const sessionsApiActions = createActionGroup({
  source: 'Sessions API',
  events: {
    'Fetch Active Sessions Success': props<{ sessions: Session[] }>(),
    'Session Stream Updated': props<{ changes: EntityChange<Session>[] }>(),
    'Start Session Success': props<{ session: Session }>(),
    'Start Session Conflict': emptyProps(),
    'Join Session Success': props<{ session: Session }>(),
    'Close Session Success': props<{ session: Session }>(),
  },
});
