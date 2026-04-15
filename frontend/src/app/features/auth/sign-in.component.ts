import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { authActions } from '../../store/account/account.actions';
import { selectAuthStatus, selectSignInError, selectIsAuthChecking } from '../../store/account/account.selectors';

@Component({
  selector: 'app-sign-in',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinner,
    TranslocoPipe,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly authStatus = toSignal(this.store.select(selectAuthStatus), {
    initialValue: 'checking' as const,
  });

  readonly signInError = toSignal(this.store.select(selectSignInError), {
    initialValue: null,
  });

  readonly isLoading = toSignal(this.store.select(selectIsAuthChecking), {
    initialValue: false,
  });

  constructor() {
    effect(() => {
      const status = this.authStatus();
      if (status === 'authenticated') {
        this.router.navigateByUrl('/');
      } else if (status === 'access_denied') {
        this.router.navigateByUrl('/access-denied');
      }
    });
  }

  readonly email = signal('');
  readonly password = signal('');
  readonly emailSubmitting = signal(false);
  readonly canSubmit = computed(() => !!this.email().trim() && !!this.password());

  readonly errorMessage = computed(() => {
    const code = this.signInError();
    if (!code) {
      return null;
    }
    switch (code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return this.transloco.translate('signIn.errors.wrongPassword');
      case 'auth/user-not-found':
        return this.transloco.translate('signIn.errors.userNotFound');
      case 'auth/too-many-requests':
        return this.transloco.translate('signIn.errors.tooManyRequests');
      case 'auth/invalid-email':
        return this.transloco.translate('signIn.errors.invalidEmail');
      default:
        return this.transloco.translate('signIn.errors.default');
    }
  });

  signInWithGoogle(): void {
    this.store.dispatch(authActions.signInWithGoogleRequested());
  }

  signInWithEmail(): void {
    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      return;
    }

    this.emailSubmitting.set(true);
    this.store.dispatch(authActions.signInWithEmailRequested({ email, password }));
  }

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }
}
