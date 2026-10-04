import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { UiFeedbackEffects } from './ui-feedback.effects';
import { uiActions } from './ui.actions';
import { autoAddActions } from '../items/items.actions';
import type { ApiFailureKind } from '../../core/diagnostics/api-failure';

describe('UiFeedbackEffects', () => {
  let effects: UiFeedbackEffects;
  let actions$: Subject<unknown>;
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let dismiss: ReturnType<typeof vi.fn>;
  let transloco: { translate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    actions$ = new Subject();
    dismiss = vi.fn();
    snackBar = { open: vi.fn(() => ({ dismiss })) };
    transloco = {
      translate: vi.fn((key: string, params?: Record<string, unknown>) =>
        params ? `t:${key}(${JSON.stringify(params)})` : `t:${key}`,
      ),
    };
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

  function failure(operation: string, kind: ApiFailureKind) {
    return uiActions.apiFailureObserved({ operation, kind });
  }

  /** The keys handed to `errors.withCause` for a given failure. */
  function reportedFor(operation: string, kind: ApiFailureKind): unknown {
    effects.showFailureSnackbar$.subscribe();
    actions$.next(failure(operation, kind));
    const call = transloco.translate.mock.calls.find(([key]) => key === 'errors.withCause');
    return call?.[1];
  }

  describe('naming the cause', () => {
    /**
     * The regression this whole mechanism exists for: every one of these used to
     * read "check your connection and try again", which sent the user hunting a
     * network fault through several shopping trips where the real cause was an
     * exhausted read quota.
     */
    const causes: [ApiFailureKind, string][] = [
      ['offline', 'errors.cause.offline'],
      ['quotaExceeded', 'errors.cause.quotaExceeded'],
      ['permissionDenied', 'errors.cause.permissionDenied'],
      ['authExpired', 'errors.cause.authExpired'],
      ['notConfigured', 'errors.cause.notConfigured'],
      ['contention', 'errors.cause.contention'],
      ['unknown', 'errors.cause.unknown'],
    ];

    for (const [kind, causeKey] of causes) {
      it(`reports ${kind} as ${causeKey}`, () => {
        expect(reportedFor('items.checkItem', kind)).toEqual({
          what: 't:errors.checkFailed',
          why: `t:${causeKey}`,
        });
      });
    }

    it('shows the composed message, never a bare cause', () => {
      effects.showFailureSnackbar$.subscribe();
      actions$.next(failure('items.checkItem', 'quotaExceeded'));

      expect(snackBar.open).toHaveBeenCalledOnce();
      const [message] = snackBar.open.mock.calls[0];
      expect(message).toContain('errors.withCause');
      expect(message).toContain('errors.checkFailed');
      expect(message).toContain('errors.cause.quotaExceeded');
    });
  });

  describe('naming the operation', () => {
    const operations: [string, string][] = [
      ['items.checkItem', 'errors.checkFailed'],
      ['items.uncheckItem', 'errors.uncheckFailed'],
      ['items.updateItem', 'errors.saveFailed'],
      ['items.addItem', 'errors.saveFailed'],
      ['sessions.startSession', 'errors.sessionStartFailed'],
      ['sessions.joinSession', 'errors.sessionStartFailed'],
      ['sessions.closeSession', 'errors.sessionCloseFailed'],
      ['sessions.discardSession', 'errors.sessionDiscardFailed'],
      ['autoAdd.evaluate', 'errors.autoAddFailed'],
      ['account.getAccount', 'errors.accountLoadFailed'],
      ['stream.listen', 'errors.streamFailed'],
      // Nothing was being saved — a read that failed must not claim otherwise.
      ['shops.fetchAllShops', 'errors.loadFailed'],
      ['categories.fetchAllCategories', 'errors.loadFailed'],
      ['categoryGroups.fetchAll', 'errors.loadFailed'],
      // Unmapped writes fall back to the generic save message.
      ['shops.renameShop', 'errors.saveFailed'],
    ];

    for (const [operation, whatKey] of operations) {
      it(`reports ${operation} as ${whatKey}`, () => {
        expect(reportedFor(operation, 'offline')).toEqual({
          what: `t:${whatKey}`,
          why: 't:errors.cause.offline',
        });
      });
    }

    /**
     * The sign-in screen renders its own error inline. A snackbar on top of it
     * would say the same thing twice, in less specific words.
     */
    it('stays quiet for operations that have their own error surface', () => {
      effects.showFailureSnackbar$.subscribe();
      actions$.next(failure('auth.signInWithEmail', 'unknown'));

      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });

  /**
   * The evaluation runs unprompted on app open and spends a visible share of the
   * day's read budget, so it is not allowed to be invisible.
   */
  describe('auto-add sync progress', () => {
    it('shows an indefinite snackbar while the sync runs', () => {
      effects.showSyncSnackbar$.subscribe();
      actions$.next(autoAddActions.syncStarted());

      expect(transloco.translate).toHaveBeenCalledWith('autoAdd.syncing');
      expect(snackBar.open).toHaveBeenCalledOnce();
      const [message, action, config] = snackBar.open.mock.calls[0];
      expect(message).toBe('t:autoAdd.syncing');
      expect(action).toBeUndefined();
      // No duration: the run's end is what dismisses it, not a timer.
      expect(config?.duration).toBeUndefined();
    });

    it('dismisses it when the sync finishes', () => {
      effects.showSyncSnackbar$.subscribe();
      actions$.next(autoAddActions.syncStarted());
      actions$.next(autoAddActions.syncFinished());

      expect(dismiss).toHaveBeenCalledOnce();
    });

    /**
     * A failed run still emits `syncFinished`, so this is the path that stops the
     * snackbar hanging around forever after a sync dies.
     */
    it('does not blow up when a finish arrives without a start', () => {
      effects.showSyncSnackbar$.subscribe();
      expect(() => actions$.next(autoAddActions.syncFinished())).not.toThrow();
      expect(dismiss).not.toHaveBeenCalled();
    });
  });
});
