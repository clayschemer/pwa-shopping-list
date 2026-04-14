import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { selectIsAuthenticated, selectIsAuthChecking } from './store/account/account.selectors';
import { selectIsPlanMode, selectIsShopMode, selectSelectedShopId } from './store/ui/ui.selectors';
import { uiActions } from './store/ui/ui.actions';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatIconButton,
    MatIcon,
    MatProgressSpinner,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly store = inject(Store);

  readonly isAuthenticated = toSignal(this.store.select(selectIsAuthenticated), {
    initialValue: false,
  });

  readonly isAuthChecking = toSignal(this.store.select(selectIsAuthChecking), {
    initialValue: true,
  });

  readonly isPlanMode = toSignal(this.store.select(selectIsPlanMode), {
    initialValue: true,
  });

  readonly isShopMode = toSignal(this.store.select(selectIsShopMode), {
    initialValue: false,
  });

  private readonly shopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null,
  });

  switchToPlan(): void {
    this.store.dispatch(uiActions.switchToPlanMode());
  }

  switchToShop(): void {
    this.store.dispatch(uiActions.switchToShopModeWithShop({ shopId: this.shopId() }));
  }
}
