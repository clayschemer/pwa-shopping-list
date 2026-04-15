import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { selectIsAuthenticated, selectIsAuthChecking } from './store/account/account.selectors';
import { selectIsPlanMode, selectIsShopMode, selectNavDrawerOpen, selectSelectedShopId } from './store/ui/ui.selectors';
import { uiActions } from './store/ui/ui.actions';
import { NavDrawerComponent } from './shell/nav-drawer/nav-drawer.component';
import type { CategoryId } from './models/ids.model';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatIconButton,
    MatIcon,
    MatProgressSpinner,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    NavDrawerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

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

  readonly navDrawerOpen = toSignal(this.store.select(selectNavDrawerOpen), {
    initialValue: false,
  });

  private readonly shopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null,
  });

  openDrawer(): void {
    this.store.dispatch(uiActions.navDrawerOpened());
  }

  onDrawerClosed(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
  }

  onCategorySelected(categoryId: CategoryId): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    // TODO: scroll to category section
  }

  onManageShops(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    this.router.navigateByUrl('/manage-shops');
  }

  onAddCategory(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    // TODO: open add category sheet
  }

  switchToPlan(): void {
    this.store.dispatch(uiActions.switchToPlanMode());
  }

  switchToShop(): void {
    this.store.dispatch(uiActions.switchToShopModeWithShop({ shopId: this.shopId() }));
  }
}
