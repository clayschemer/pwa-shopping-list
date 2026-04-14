import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatButtonModule } from '@angular/material/button';
import { authActions } from '../../store/account/account.actions';
import { selectCurrentUser } from '../../store/account/account.selectors';

@Component({
  selector: 'app-access-denied',
  imports: [MatButtonModule],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedComponent {
  private readonly store = inject(Store);

  readonly userEmail = toSignal(this.store.select(selectCurrentUser), {
    initialValue: null,
  });

  tryDifferentAccount(): void {
    this.store.dispatch(authActions.signOutRequested());
  }
}
