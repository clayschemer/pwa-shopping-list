import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { UiFeedbackEffects } from './ui-feedback.effects';
import { itemsActions } from '../items/items.actions';
import { sessionsActions } from '../sessions/sessions.actions';
import type { ItemId, SessionId } from '../../models/ids.model';

describe('UiFeedbackEffects', () => {
  let effects: UiFeedbackEffects;
  let actions$: Subject<unknown>;
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let transloco: { translate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    actions$ = new Subject();
    snackBar = { open: vi.fn() };
    transloco = { translate: vi.fn((key: string) => `t:${key}`) };
    TestBed.configureTestingModule({
      providers: [
        UiFeedbackEffects,
        provideMockActions(() => actions$),
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TranslocoService, useValue: transloco },
      ],
    });
    effects = TestBed.inject(UiFeedbackEffects);
  });

  const cases: [string, unknown, string][] = [
    [
      'itemCheckFailed',
      itemsActions.itemCheckFailed({ id: 'i1' as ItemId }),
      'errors.checkFailed',
    ],
    [
      'itemUncheckFailed',
      itemsActions.itemUncheckFailed({ id: 'i1' as ItemId }),
      'errors.uncheckFailed',
    ],
    [
      'itemSaveFailed',
      itemsActions.itemSaveFailed({ id: null }),
      'errors.saveFailed',
    ],
    [
      'sessionStartFailed',
      sessionsActions.sessionStartFailed(),
      'errors.sessionStartFailed',
    ],
    [
      'sessionCloseFailed',
      sessionsActions.sessionCloseFailed({ sessionId: 's1' as SessionId }),
      'errors.sessionCloseFailed',
    ],
    [
      'sessionDiscardFailed',
      sessionsActions.sessionDiscardFailed({ sessionId: 's1' as SessionId }),
      'errors.sessionDiscardFailed',
    ],
  ];

  for (const [name, action, key] of cases) {
    it(`shows a translated snackbar on ${name}`, () => {
      effects.showFailureSnackbar$.subscribe();
      actions$.next(action);
      expect(transloco.translate).toHaveBeenCalledWith(key);
      expect(snackBar.open).toHaveBeenCalledWith(
        `t:${key}`,
        undefined,
        expect.objectContaining({ duration: expect.any(Number) }),
      );
    });
  }
});
