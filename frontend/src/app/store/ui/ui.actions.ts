import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ShopId } from '../../models/ids.model';
import type { ApiFailureKind } from '../../core/diagnostics/api-failure';

export const uiActions = createActionGroup({
  source: 'UI',
  events: {
    'Switch To Plan Mode': emptyProps(),
    'Switch To Shop Mode With Shop': props<{ shopId: ShopId | null }>(),
    'Nav Drawer Opened': emptyProps(),
    'Nav Drawer Closed': emptyProps(),
    'Plan Mode Shop Selected': props<{ shopId: ShopId | null }>(),
    /**
     * An API call failed and its cause has been classified. Emitted by
     * `onApiFailure` for every swallowed failure, carrying enough to tell the
     * user what could not be done *and* why — the operation names the first,
     * the kind names the second.
     */
    'Api Failure Observed': props<{ operation: string; kind: ApiFailureKind }>(),
  },
});
