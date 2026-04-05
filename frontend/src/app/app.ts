import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NavDrawerComponent } from './features/shared/nav-drawer.component';
import { selectIsAuthenticated } from './store/account/account.selectors';
import { selectIsShopMode, selectIsPlanMode, selectSelectedShopId } from './store/ui/ui.selectors';
import { selectCurrentUser } from './store/account/account.selectors';
import { selectMyActiveSession } from './store/sessions/sessions.selectors';
import { selectShopById } from './store/shops/shops.selectors';
import { uiActions } from './store/ui/ui.actions';
import { switchMap, of } from 'rxjs';
import type { ShopId } from './models/ids.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatIconButton,
    MatIcon,
    NavDrawerComponent,
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

  readonly isPlanMode = toSignal(this.store.select(selectIsPlanMode), {
    initialValue: true,
  });

  readonly isShopMode = toSignal(this.store.select(selectIsShopMode), {
    initialValue: false,
  });

  private readonly shopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null,
  });

  private readonly activeSessionShopId = toSignal(
    this.store.select(selectCurrentUser).pipe(
      switchMap((user) =>
        user
          ? this.store.select(selectMyActiveSession(user.id))
          : of(null),
      ),
      switchMap((session) =>
        session?.shopId
          ? this.store.select(selectShopById(session.shopId as ShopId))
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  readonly sessionShopName = computed(() =>
    this.activeSessionShopId()?.name ?? 'Global',
  );

  switchToPlan(): void {
    this.store.dispatch(uiActions.switchToPlanMode());
  }

  switchToShop(): void {
    this.store.dispatch(uiActions.switchToShopModeWithShop({ shopId: this.shopId() }));
  }
}
