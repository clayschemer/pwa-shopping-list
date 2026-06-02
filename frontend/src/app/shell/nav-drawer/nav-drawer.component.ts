import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatDivider } from '@angular/material/divider';
import { TranslocoPipe } from '@jsverse/transloco';
import { selectOrderedShops } from '../../store/selectors/ordered-shops.selectors';
import { selectSelectedShopId } from '../../store/ui/ui.selectors';
import { uiActions } from '../../store/ui/ui.actions';
import type { ShopId } from '../../models/ids.model';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-nav-drawer',
  imports: [
    MatButton,
    MatFormField,
    MatDivider,
    MatIcon,
    MatLabel,
    MatSelect,
    MatOption,
    TranslocoPipe,
  ],
  templateUrl: './nav-drawer.component.html',
  styleUrl: './nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavDrawerComponent {
  private readonly store = inject(Store);

  readonly shops = toSignal(this.store.select(selectOrderedShops), { initialValue: [] });
  readonly selectedShopId = toSignal(this.store.select(selectSelectedShopId), { initialValue: null });

  readonly viewCategories = output<void>();
  readonly manageShops = output<void>();
  readonly viewHistory = output<void>();
  readonly viewSettings = output<void>();

  onShopChanged(shopId: string): void {
    const id = shopId === '' ? null : (shopId as ShopId);
    this.store.dispatch(uiActions.planModeShopSelected({ shopId: id }));
  }

  onViewCategories(): void {
    this.viewCategories.emit();
  }

  onManageShops(): void {
    this.manageShops.emit();
  }

  onViewHistory(): void {
    this.viewHistory.emit();
  }

  onViewSettings(): void {
    this.viewSettings.emit();
  }
}
