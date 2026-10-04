import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { BootProgressComponent } from './boot-progress.component';
import { accountReducer } from '../../store/account/account.reducer';
import { itemsReducer } from '../../store/items/items.reducer';
import { categoriesReducer } from '../../store/categories/categories.reducer';
import { categoryGroupsReducer } from '../../store/category-groups/category-groups.reducer';
import { shopsReducer } from '../../store/shops/shops.reducer';
import { sessionsReducer } from '../../store/sessions/sessions.reducer';
import { authActions } from '../../store/account/account.actions';
import type { AccountId, UserId } from '../../models/ids.model';

const user = {
  id: 'u1' as UserId,
  accountId: 'a1' as AccountId,
  email: 't@t.com',
  displayName: 'T',
};

describe('BootProgressComponent', () => {
  let fixture: ComponentFixture<BootProgressComponent>;
  let store: Store;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BootProgressComponent, provideTranslocoTesting()],
      providers: [
        provideStore({
          account: accountReducer,
          items: itemsReducer,
          categories: categoriesReducer,
          categoryGroups: categoryGroupsReducer,
          shops: shopsReducer,
          sessions: sessionsReducer,
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    fixture = TestBed.createComponent(BootProgressComponent);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('exposes the bar as a progressbar with the current value', () => {
    const track = el.querySelector('.app-boot-progress__track')!;
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('100');
    expect(Number(track.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  });

  it('widens the fill as milestones land', () => {
    const fill = () =>
      (el.querySelector('.app-boot-progress__fill') as HTMLElement).style.width;
    const before = parseFloat(fill());

    store.dispatch(authActions.authStateResolved({ user }));
    fixture.detectChanges();

    expect(parseFloat(fill())).toBeGreaterThan(before);
  });

  it('renders a translated phase headline', () => {
    const phase = el.querySelector('.app-boot-progress__phase')!;
    // Resolved through transloco, so it must not be the raw key.
    expect(phase.textContent?.trim()).toBe('Signing in');
  });

  it('announces the phase politely', () => {
    expect(el.querySelector('.app-boot-progress__phase')?.getAttribute('role')).toBe(
      'status',
    );
  });

  /**
   * The diagnostics line is language-neutral and updates far too often to be
   * announced — it is there to be read, not heard.
   */
  it('hides the diagnostics line from assistive technology', () => {
    expect(
      el.querySelector('.app-boot-progress__diagnostics')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('shows the identifier of whatever is outstanding', () => {
    const detail = el.querySelector('.app-boot-progress__detail');
    expect(detail?.textContent?.trim()).toBe('firebase · auth');
  });
});
