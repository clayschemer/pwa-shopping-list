import '../testing/init-testbed';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { accountReducer } from './store/account/account.reducer';
import { categoriesReducer } from './store/categories/categories.reducer';
import { shopsReducer } from './store/shops/shops.reducer';
import { itemsReducer } from './store/items/items.reducer';
import { sessionsReducer } from './store/sessions/sessions.reducer';
import { uiReducer } from './store/ui/ui.reducer';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideStore({
          account: accountReducer,
          categories: categoriesReducer,
          shops: shopsReducer,
          items: itemsReducer,
          sessions: sessionsReducer,
          ui: uiReducer,
        }),
        provideEffects([]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the top bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.top-bar')).toBeTruthy();
  });
});
