import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ShopId } from '../../models/ids.model';

export const uiActions = createActionGroup({
  source: 'UI',
  events: {
    'Switch To Plan Mode': emptyProps(),
    'Switch To Shop Mode With Shop': props<{ shopId: ShopId | null }>(),
  },
});
