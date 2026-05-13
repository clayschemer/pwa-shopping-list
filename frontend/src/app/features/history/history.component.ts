import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SessionApiService } from '../../core/api/session-api.service';
import { selectShopEntities } from '../../store/shops/shops.selectors';
import { selectItemEntities } from '../../store/items/items.selectors';
import { selectUserEntities } from '../../store/users/users.selectors';
import { MoneyPipe } from '../../core/format/money.pipe';
import type { Session, SessionCheckedItem } from '../../models/session.model';
import type { Item } from '../../models/item.model';
import type { Shop } from '../../models/shop.model';
import type { User } from '../../models/user.model';
import type { Dictionary } from '@ngrx/entity';

interface HistoryRow {
  id: string;
  shopName: string;
  completedAt: number;
  total: number;
  itemCount: number;
  items: HistoryItemRow[];
}

interface HistoryItemRow {
  name: string;
  quantity: number;
  unit: string | null;
  priceSnapshot: number | null;
}

@Component({
  selector: 'app-history',
  imports: [
    DatePipe,
    MatIconButton,
    MatIcon,
    MatExpansionModule,
    MatProgressSpinner,
    TranslocoPipe,
    MoneyPipe,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly location = inject(Location);
  private readonly sessionApi = inject(SessionApiService);
  private readonly transloco = inject(TranslocoService);

  private readonly sessions = signal<Session[] | null>(null);
  private readonly shopEntities = toSignal(this.store.select(selectShopEntities), {
    initialValue: {} as Dictionary<Shop>,
  });
  private readonly itemEntities = toSignal(this.store.select(selectItemEntities), {
    initialValue: {} as Dictionary<Item>,
  });
  private readonly userEntities = toSignal(this.store.select(selectUserEntities), {
    initialValue: {} as Dictionary<User>,
  });

  readonly loading = computed(() => this.sessions() === null);

  readonly rows = computed<HistoryRow[]>(() => {
    const sessions = this.sessions();
    if (!sessions) return [];
    const shops = this.shopEntities();
    const items = this.itemEntities();
    const globalLabel = this.transloco.translate('nav.global');
    const unknownItem = this.transloco.translate('history.unknownItem');
    return sessions.filter((s) => s.checkedItems.length > 0).map((s) => ({
      id: s.id,
      shopName: s.shopId ? shops[s.shopId]?.name ?? globalLabel : globalLabel,
      completedAt: s.completedAt ?? 0,
      total: s.checkedItems.reduce((acc, c) => acc + (c.priceSnapshot ?? 0), 0),
      itemCount: s.checkedItems.length,
      items: s.checkedItems.map((c: SessionCheckedItem) => ({
        name: c.nameSnapshot ?? items[c.itemId]?.name ?? unknownItem,
        quantity: items[c.itemId]?.quantity ?? 1,
        unit: c.priceUnitSnapshot,
        priceSnapshot: c.priceSnapshot,
      })),
    }));
  });

  async ngOnInit(): Promise<void> {
    const sessions = await this.sessionApi.fetchSessionHistory();
    this.sessions.set(sessions);
  }

  goBack(): void {
    this.location.back();
  }
}
