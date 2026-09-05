import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideStore, Store } from '@ngrx/store';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import en from '../../../../public/assets/i18n/en.json';
import sv from '../../../../public/assets/i18n/sv.json';
import { HistoryComponent } from './history.component';
import { SessionApiService } from '../../core/api/session-api.service';
import { itemsReducer } from '../../store/items/items.reducer';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { usersReducer } from '../../store/users/users.reducer';
import { itemsActions } from '../../store/items/items.actions';
import type { Session } from '../../models/session.model';
import type {
  AccountId,
  ItemId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';

describe('HistoryComponent', () => {
  let fixture: ComponentFixture<HistoryComponent>;
  let sessionApi: { fetchSessionHistory: ReturnType<typeof vi.fn> };

  async function configure(session: Session): Promise<Store> {
    sessionApi = { fetchSessionHistory: vi.fn().mockResolvedValue([session]) };

    await TestBed.configureTestingModule({
      imports: [HistoryComponent, provideTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideStore({
          items: itemsReducer,
          shops: shopsReducer,
          users: usersReducer,
        }),
        { provide: SessionApiService, useValue: sessionApi },
        { provide: Location, useValue: { back: () => undefined } },
      ],
    }).compileComponents();

    return TestBed.inject(Store);
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('displays the snapshotted item name when the item is not in the entity store', async () => {
    const session: Session = {
      id: 's1' as SessionId,
      accountId: 'a1' as AccountId,
      shopId: 'shop-1' as ShopId,
      participants: ['u1' as UserId],
      startedBy: 'u1' as UserId,
      startedAt: 1,
      completedAt: 100,
      checkedItems: [
        {
          itemId: 'gone' as ItemId,
          checkedBy: 'u1' as UserId,
          checkedAt: 10,
          priceSnapshot: 2.5,
          priceQuantitySnapshot: null,
          priceUnitSnapshot: null,
          nameSnapshot: 'Bananas',
          quantitySnapshot: null,
          unitSnapshot: null,
        },
      ],
    };

    await configure(session);
    await render();

    const el: HTMLElement = fixture.nativeElement;
    const itemName = el
      .querySelector('.app-history__item-name')
      ?.textContent?.trim();
    expect(itemName).toBe('Bananas');
    expect(itemName).not.toBe('Deleted item');
    expect(itemName).not.toBe('—');
  });

  it('uses the snapshot name even when the item still exists with a new name', async () => {
    const session: Session = {
      id: 's1' as SessionId,
      accountId: 'a1' as AccountId,
      shopId: 'shop-1' as ShopId,
      participants: ['u1' as UserId],
      startedBy: 'u1' as UserId,
      startedAt: 1,
      completedAt: 100,
      checkedItems: [
        {
          itemId: 'i1' as ItemId,
          checkedBy: 'u1' as UserId,
          checkedAt: 10,
          priceSnapshot: 1,
          priceQuantitySnapshot: null,
          priceUnitSnapshot: null,
          nameSnapshot: 'Old name',
          quantitySnapshot: null,
          unitSnapshot: null,
        },
      ],
    };

    const store = await configure(session);
    store.dispatch(
      itemsActions.itemsLoaded({
        items: [
          {
            id: 'i1' as ItemId,
            accountId: 'a1' as AccountId,
            name: 'New name',
            description: null,
            quantity: null,
            unit: null,
            primaryCategoryId: null,
            secondaryCategoryIds: [],
            removed: false,
            removedAt: null,
            addedBy: 'user',
            aiMotivation: null,
            price: null,
            priceQuantity: null,
            priceUnit: null,
            priceUpdatedAt: null,
            sizePerPieceQuantity: null,
            sizePerPieceUnit: null,
            purchaseCount: 0,
          },
        ],
      }),
    );

    await render();

    const el: HTMLElement = fixture.nativeElement;
    const itemName = el
      .querySelector('.app-history__item-name')
      ?.textContent?.trim();
    expect(itemName).toBe('Old name');
  });

  it('renders quantity and unit from the snapshot alongside the name', async () => {
    const session: Session = {
      id: 's1' as SessionId,
      accountId: 'a1' as AccountId,
      shopId: 'shop-1' as ShopId,
      participants: ['u1' as UserId],
      startedBy: 'u1' as UserId,
      startedAt: 1,
      completedAt: 100,
      checkedItems: [
        {
          itemId: 'i1' as ItemId,
          checkedBy: 'u1' as UserId,
          checkedAt: 10,
          priceSnapshot: 1,
          priceQuantitySnapshot: null,
          priceUnitSnapshot: null,
          nameSnapshot: 'Flour',
          quantitySnapshot: 400,
          unitSnapshot: 'g',
        },
      ],
    };

    await configure(session);
    await render();

    const el: HTMLElement = fixture.nativeElement;
    const nameText = el
      .querySelector('.app-history__item-name')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    expect(nameText).toBe('Flour, 400 g');
  });

  it('localises the canonical unit via units.* when rendering', async () => {
    sessionApi = {
      fetchSessionHistory: vi.fn().mockResolvedValue([
        {
          id: 's1' as SessionId,
          accountId: 'a1' as AccountId,
          shopId: 'shop-1' as ShopId,
          participants: ['u1' as UserId],
          startedBy: 'u1' as UserId,
          startedAt: 1,
          completedAt: 100,
          checkedItems: [
            {
              itemId: 'i1' as ItemId,
              checkedBy: 'u1' as UserId,
              checkedAt: 10,
              priceSnapshot: null,
              priceQuantitySnapshot: null,
              priceUnitSnapshot: null,
              nameSnapshot: 'Lemons',
              quantitySnapshot: 1,
              unitSnapshot: 'pcs',
            },
          ],
        } satisfies Session,
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [
        HistoryComponent,
        TranslocoTestingModule.forRoot({
          langs: { en, sv },
          translocoConfig: {
            availableLangs: ['en', 'sv'],
            defaultLang: 'en',
          },
        }),
      ],
      providers: [
        provideRouter([]),
        provideStore({
          items: itemsReducer,
          shops: shopsReducer,
          users: usersReducer,
        }),
        { provide: SessionApiService, useValue: sessionApi },
        { provide: Location, useValue: { back: () => undefined } },
      ],
    }).compileComponents();
    TestBed.inject(TranslocoService).setActiveLang('sv');

    await render();

    const el: HTMLElement = fixture.nativeElement;
    const nameText = el
      .querySelector('.app-history__item-name')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    expect(nameText).toBe('Lemons, 1 st');
    expect(nameText).not.toContain('pcs');
  });

  it('omits the qty span for legacy entries without quantity/unit snapshots', async () => {
    const session: Session = {
      id: 's1' as SessionId,
      accountId: 'a1' as AccountId,
      shopId: 'shop-1' as ShopId,
      participants: ['u1' as UserId],
      startedBy: 'u1' as UserId,
      startedAt: 1,
      completedAt: 100,
      checkedItems: [
        {
          itemId: 'i1' as ItemId,
          checkedBy: 'u1' as UserId,
          checkedAt: 10,
          priceSnapshot: 1,
          priceQuantitySnapshot: null,
          priceUnitSnapshot: null,
          nameSnapshot: 'Legacy item',
          quantitySnapshot: null,
          unitSnapshot: null,
        },
      ],
    };

    await configure(session);
    await render();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-history__item-qty')).toBeNull();
    const nameText = el
      .querySelector('.app-history__item-name')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    expect(nameText).toBe('Legacy item');
  });
});
