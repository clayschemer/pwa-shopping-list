import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { authActions } from '../../store/account/account.actions';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly store = inject(Store);

  signIn(): void {
    this.store.dispatch(authActions.signInRequested());
  }
}
