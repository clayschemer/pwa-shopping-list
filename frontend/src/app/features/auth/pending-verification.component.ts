import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { authActions } from '../../store/account/account.actions';
import { selectCurrentUser } from '../../store/account/account.selectors';

/**
 * Reloads the current page. Behind a DI token so tests can substitute it.
 */
export const RELOAD_PAGE = new InjectionToken<() => void>('RELOAD_PAGE', {
  providedIn: 'root',
  factory: () => () => window.location.reload(),
});

@Component({
  selector: 'app-pending-verification',
  imports: [MatButtonModule, TranslocoPipe],
  templateUrl: './pending-verification.component.html',
  styleUrl: './pending-verification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingVerificationComponent {
  private readonly store = inject(Store);
  private readonly reload = inject(RELOAD_PAGE);

  readonly userEmail = toSignal(this.store.select(selectCurrentUser), {
    initialValue: null,
  });

  reloadNow(): void {
    this.reload();
  }

  switchAccount(): void {
    this.store.dispatch(authActions.signOutRequested());
  }
}
