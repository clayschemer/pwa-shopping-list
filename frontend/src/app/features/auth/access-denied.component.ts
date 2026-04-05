import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { authActions } from '../../store/account/account.actions';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedComponent {
  private readonly store = inject(Store);

  signOut(): void {
    this.store.dispatch(authActions.signOutRequested());
  }
}
