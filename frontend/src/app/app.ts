import { ChangeDetectionStrategy, Component, DestroyRef, inject, computed, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslocoService } from '@jsverse/transloco';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatBadge } from '@angular/material/badge';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectIsAuthenticated, selectIsAuthChecking } from './store/account/account.selectors';
import {
  selectIsPlanMode,
  selectIsShopMode,
  selectNavDrawerOpen,
  selectSelectedShopId,
} from './store/ui/ui.selectors';
import { selectAllShops, selectShopEntities } from './store/shops/shops.selectors';
import { selectActiveSessionForCurrentShop, selectShopsWithActiveSessions } from './store/sessions/sessions.selectors';
import { selectUserEntities } from './store/users/users.selectors';
import { selectActiveSessionTotal } from './store/selectors/grouped-shop-list.selectors';
import {
  selectAllItems,
  selectItemEntities,
} from './store/items/items.selectors';
import { uiActions } from './store/ui/ui.actions';
import { sessionsActions, sessionsApiActions } from './store/sessions/sessions.actions';
import { itemsApiActions } from './store/items/items.actions';
import { NavDrawerComponent } from './shell/nav-drawer/nav-drawer.component';
import { ShopBannerComponent } from './shell/shop-banner/shop-banner.component';
import { AppShellSkeletonComponent } from './shell/app-shell-skeleton/app-shell-skeleton.component';
import { BootProgressComponent } from './shell/boot-progress/boot-progress.component';
import { BootProgressService } from './core/boot/boot-progress.service';
import {
  ShopSelectSheetComponent,
  ShopSelectData,
  ShopSelectResult,
} from './features/shop/shop-select-sheet.component';
import {
  ShopModeChangeDialogComponent,
  ShopModeChangeResult,
} from './features/shop/shop-mode-change-dialog.component';
import {
  CloseSessionDialogComponent,
  CloseSessionData,
  CloseSessionResult,
} from './features/shop/close-session-dialog.component';
import {
  UndoHistorySheetComponent,
  UndoHistoryData,
} from './features/shop/undo-history-sheet.component';
import {
  InactivityReminderDialogComponent,
  InactivityReminderResult,
} from './features/shop/inactivity-reminder-dialog.component';
import { PlanFilterSheetComponent } from './features/plan/plan-filter-sheet/plan-filter-sheet.component';
import { ThemeService } from './core/theme/theme.service';
import { MoneyPipe } from './core/format/money.pipe';
import type { ItemId, SessionId, ShopId, UserId } from './models/ids.model';
import type { Item } from './models/item.model';
import type { Shop } from './models/shop.model';
import type { User } from './models/user.model';
import type { Dictionary } from '@ngrx/entity';

const FULL_SCREEN_ROUTES = ['/settings', '/stores', '/history', '/categories'];

const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/': '',
  '/shop': '',
  '/settings': 'settings.title',
  '/stores': 'stores.title',
  '/history': 'history.title',
  '/categories': 'categories.title',
  '/sign-in': 'signIn.title',
  '/access-denied': 'accessDenied.title',
  '/pending-verification': 'pendingVerification.title',
};

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatIconButton,
    MatIcon,
    MatBadge,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    NavDrawerComponent,
    ShopBannerComponent,
    AppShellSkeletonComponent,
    BootProgressComponent,
    TranslocoPipe,
    MoneyPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly themeService = inject(ThemeService);
  private readonly bootProgress = inject(BootProgressService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private inactivityDialogOpen = false;

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

  readonly shopId = toSignal(this.store.select(selectSelectedShopId), {
    initialValue: null,
  });

  readonly shops = toSignal(this.store.select(selectAllShops), {
    initialValue: [],
  });

  private readonly shopEntities = toSignal(this.store.select(selectShopEntities), {
    initialValue: {} as Dictionary<Shop>,
  });

  readonly activeSession = toSignal(
    this.store.select(selectActiveSessionForCurrentShop),
    { initialValue: null },
  );

  readonly sessionTotal = toSignal(
    this.store.select(selectActiveSessionTotal),
    { initialValue: 0 },
  );

  private readonly allItems = toSignal(this.store.select(selectAllItems), {
    initialValue: [],
  });

  private readonly itemEntities = toSignal(
    this.store.select(selectItemEntities),
    { initialValue: {} },
  );

  private readonly activeSessionShopIds = toSignal(
    this.store.select(selectShopsWithActiveSessions),
    { initialValue: new Set<import('./models/ids.model').ShopId | null>() },
  );

  private readonly userEntities = toSignal(
    this.store.select(selectUserEntities),
    { initialValue: {} as Dictionary<User> },
  );

  readonly checkedCount = computed(
    () => this.activeSession()?.checkedItems.length ?? 0,
  );

  readonly selectedShopName = computed<string | null>(() => {
    const id = this.shopId();
    if (!id) return null;
    return this.shopEntities()[id]?.name ?? null;
  });

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly isFullScreenRoute = computed(() =>
    FULL_SCREEN_ROUTES.some((r) => this.currentUrl().startsWith(r)),
  );

  /** Covers the whole boot sequence, spanning the shell skeleton and the plan skeleton. */
  readonly showBootProgress = computed(() => !this.bootProgress.complete());

  readonly showShopBanner = computed(
    () =>
      (!this.isFullScreenRoute() || this.currentUrl().startsWith('/categories')) &&
      !this.navDrawerOpen(),
  );

  constructor() {
    effect(() => {
      const shopMode = this.isShopMode();
      const url = this.currentUrl();
      if (shopMode && !url.startsWith('/shop')) {
        this.router.navigateByUrl('/shop');
      } else if (!shopMode && url.startsWith('/shop')) {
        this.router.navigateByUrl('/');
      }
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.updatePageTitle(e.urlAfterRedirects));
    this.transloco.selectTranslate('app.name')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updatePageTitle(this.router.url));

    this.actions$
      .pipe(
        ofType(sessionsActions.sessionInactive),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ sessionId }) => this.openInactivityReminder(sessionId));

  }

  private updatePageTitle(url: string): void {
    const appName = this.transloco.translate('app.name');
    const path = url.split('?')[0]!;
    const titleKey = ROUTE_TITLE_KEYS[path];
    if (titleKey) {
      const pageTitle = this.transloco.translate(titleKey);
      this.titleService.setTitle(`${pageTitle} — ${appName}`);
    } else {
      this.titleService.setTitle(appName);
    }
  }

  private openInactivityReminder(sessionId: SessionId): void {
    if (this.inactivityDialogOpen) return;
    this.inactivityDialogOpen = true;
    const ref = this.dialog.open<
      InactivityReminderDialogComponent,
      void,
      InactivityReminderResult
    >(InactivityReminderDialogComponent);
    ref.afterClosed().subscribe((result) => {
      this.inactivityDialogOpen = false;
      if (result === 'close') {
        this.store.dispatch(
          sessionsApiActions.closeSessionRequested({ sessionId }),
        );
      } else if (result === 'discard') {
        this.store.dispatch(
          sessionsApiActions.discardSessionRequested({ sessionId }),
        );
      } else {
        this.store.dispatch(
          sessionsActions.sessionInactivityDismissed({ sessionId }),
        );
      }
    });
  }

  openDrawer(): void {
    this.store.dispatch(uiActions.navDrawerOpened());
  }

  onDrawerClosed(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
  }

  onViewCategories(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    this.router.navigateByUrl('/categories');
  }

  onManageShops(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    this.router.navigateByUrl('/stores');
  }

  onViewHistory(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    this.router.navigateByUrl('/history');
  }

  onViewSettings(): void {
    this.store.dispatch(uiActions.navDrawerClosed());
    this.router.navigateByUrl('/settings');
  }

  openPlanFilters(): void {
    this.bottomSheet.open(PlanFilterSheetComponent);
  }

  switchToPlan(): void {
    this.store.dispatch(uiActions.switchToPlanMode());
  }

  switchToShop(): void {
    const shops = this.shops();
    if (shops.length === 0) {
      this.store.dispatch(uiActions.switchToShopModeWithShop({ shopId: null }));
      return;
    }
    this.openShopSelectSheet();
  }

  onShopBannerShopSelected(shopId: ShopId | null): void {
    this.store.dispatch(uiActions.planModeShopSelected({ shopId }));
  }

  onShopBannerChangeRequested(): void {
    const ref = this.dialog.open<
      ShopModeChangeDialogComponent,
      void,
      ShopModeChangeResult
    >(ShopModeChangeDialogComponent);
    ref.afterClosed().subscribe((result) => {
      if (result === 'switch-to-plan') {
        this.store.dispatch(uiActions.switchToPlanMode());
      } else if (result === 'start-session') {
        this.openShopSelectSheet();
      }
    });
  }

  private openShopSelectSheet(): void {
    const ref = this.bottomSheet.open<
      ShopSelectSheetComponent,
      ShopSelectData,
      ShopSelectResult
    >(ShopSelectSheetComponent, {
      data: { shops: this.shops(), activeSessionShopIds: this.activeSessionShopIds() },
    });
    ref.afterDismissed().subscribe((result) => {
      if (!result) return;
      this.store.dispatch(
        uiActions.switchToShopModeWithShop({ shopId: result.shopId }),
      );
    });
  }

  onSessionPillClicked(): void {
    const session = this.activeSession();
    if (!session) return;
    const activeItemCount = this.allItems().filter((i) => !i.removed).length;
    const ref = this.dialog.open<
      CloseSessionDialogComponent,
      CloseSessionData,
      CloseSessionResult
    >(CloseSessionDialogComponent, {
      data: { allChecked: activeItemCount === 0 },
    });
    ref.afterClosed().subscribe((result) => {
      if (result === 'close') {
        this.store.dispatch(
          sessionsApiActions.closeSessionRequested({ sessionId: session.id }),
        );
      } else if (result === 'discard') {
        this.store.dispatch(
          sessionsApiActions.discardSessionRequested({ sessionId: session.id }),
        );
      }
    });
  }

  onOpenUndoHistory(): void {
    const session = this.activeSession();
    if (!session) return;
    const itemsById = this.itemEntities() as Record<ItemId, Item>;
    const usersById = this.userEntities() as Record<UserId, User>;
    const ref = this.bottomSheet.open<
      UndoHistorySheetComponent,
      UndoHistoryData,
      ItemId
    >(UndoHistorySheetComponent, {
      data: {
        checkedItems: session.checkedItems,
        itemsById,
        usersById,
      },
    });
    ref.afterDismissed().subscribe((itemId) => {
      if (!itemId) return;
      this.store.dispatch(
        itemsApiActions.uncheckItemRequested({
          id: itemId,
          sessionId: session.id,
        }),
      );
    });
  }

}
