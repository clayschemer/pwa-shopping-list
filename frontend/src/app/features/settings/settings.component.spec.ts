import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { SettingsComponent } from './settings.component';
import { ThemeService, AppSettings } from '../../core/theme/theme.service';
import { accountReducer } from '../../store/account/account.reducer';
import { uiReducer } from '../../store/ui/ui.reducer';
import { authActions, accountActions } from '../../store/account/account.actions';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { AccountId, UserId } from '../../models/ids.model';

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: null,
  compact: false,
  reduceMotion: null,
  highContrast: null,
  leftHanded: false,
  language: 'EN',
  currency: 'GBP',
  keepScreenAwake: true,
};

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let store: Store;
  let themeService: {
    settings: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    effectiveDarkMode: ReturnType<typeof vi.fn>;
    effectiveReduceMotion: ReturnType<typeof vi.fn>;
    effectiveHighContrast: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    localStorage.clear();

    themeService = {
      settings: vi.fn().mockReturnValue({ ...DEFAULT_SETTINGS }),
      update: vi.fn(),
      effectiveDarkMode: vi.fn().mockReturnValue(false),
      effectiveReduceMotion: vi.fn().mockReturnValue(false),
      effectiveHighContrast: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, provideTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideStore({
          account: accountReducer,
          ui: uiReducer,
        }),
        { provide: ThemeService, useValue: themeService },
      ],
    }).compileComponents();

    store = TestBed.inject(Store);
    store.dispatch(authActions.authStateResolved({
      user: {
        id: 'u1' as UserId,
        accountId: 'a1' as AccountId,
        email: 'test@example.com',
        displayName: 'Test User',
      },
    }));
    store.dispatch(accountActions.accountLoaded({
      account: {
        id: 'a1' as AccountId,
        name: 'Test Account',
        aiConfig: null,
      },
    }));

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Appearance section', () => {
    const el: HTMLElement = fixture.nativeElement;
    const headings = Array.from(el.querySelectorAll('.app-settings__section-title'))
      .map((e) => e.textContent?.trim());
    expect(headings).toContain('Appearance');
  });

  it('renders the Accessibility section', () => {
    const el: HTMLElement = fixture.nativeElement;
    const headings = Array.from(el.querySelectorAll('.app-settings__section-title'))
      .map((e) => e.textContent?.trim());
    expect(headings).toContain('Accessibility');
  });

  it('renders the Language & Region section', () => {
    const el: HTMLElement = fixture.nativeElement;
    const headings = Array.from(el.querySelectorAll('.app-settings__section-title'))
      .map((e) => e.textContent?.trim());
    expect(headings).toContain('Language & Region');
  });

  it('renders the Display section', () => {
    const el: HTMLElement = fixture.nativeElement;
    const headings = Array.from(el.querySelectorAll('.app-settings__section-title'))
      .map((e) => e.textContent?.trim());
    expect(headings).toContain('Display');
  });

  it('renders the Account section', () => {
    const el: HTMLElement = fixture.nativeElement;
    const headings = Array.from(el.querySelectorAll('.app-settings__section-title'))
      .map((e) => e.textContent?.trim());
    expect(headings).toContain('Account');
  });

  it('shows the signed-in email', () => {
    const el: HTMLElement = fixture.nativeElement;
    const email = el.querySelector('.app-settings__email');
    expect(email?.textContent?.trim()).toBe('test@example.com');
  });

  it('renders a back button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const backBtn = el.querySelector('.app-settings__back-btn');
    expect(backBtn).toBeTruthy();
  });

  it('calls themeService.update when dark mode toggle is changed', () => {
    component.onDarkModeToggle(true);
    expect(themeService.update).toHaveBeenCalledWith({ darkMode: true });
  });

  it('calls themeService.update when compact toggle is changed', () => {
    component.onCompactToggle(true);
    expect(themeService.update).toHaveBeenCalledWith({ compact: true });
  });

  it('calls themeService.update when reduce motion toggle is changed', () => {
    component.onReduceMotionToggle(true);
    expect(themeService.update).toHaveBeenCalledWith({ reduceMotion: true });
  });

  it('calls themeService.update when high contrast toggle is changed', () => {
    component.onHighContrastToggle(true);
    expect(themeService.update).toHaveBeenCalledWith({ highContrast: true });
  });

  it('calls themeService.update when left-handed toggle is changed', () => {
    component.onLeftHandedToggle(true);
    expect(themeService.update).toHaveBeenCalledWith({ leftHanded: true });
  });

  it('calls themeService.update when keep screen awake toggle is changed', () => {
    component.onKeepScreenAwakeToggle(false);
    expect(themeService.update).toHaveBeenCalledWith({ keepScreenAwake: false });
  });

  it('calls themeService.update when language is changed', () => {
    component.onLanguageChange('NO');
    expect(themeService.update).toHaveBeenCalledWith({ language: 'NO' });
  });

  it('calls themeService.update when currency is changed', () => {
    component.onCurrencyChange('EUR');
    expect(themeService.update).toHaveBeenCalledWith({ currency: 'EUR' });
  });

  describe('toggles reflect effective system state', () => {
    it('dark mode toggle reflects effective state when system prefers dark', () => {
      themeService.settings.mockReturnValue({ ...DEFAULT_SETTINGS, darkMode: null });
      themeService.effectiveDarkMode.mockReturnValue(true);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const appearanceSection = el.querySelectorAll('.app-settings__section')[0];
      const toggleBtn = appearanceSection.querySelector('mat-slide-toggle button[role="switch"]') as HTMLElement;
      expect(toggleBtn.getAttribute('aria-checked')).toBe('true');
    });

    it('dark mode toggle reflects effective state when system prefers light', () => {
      themeService.settings.mockReturnValue({ ...DEFAULT_SETTINGS, darkMode: null });
      themeService.effectiveDarkMode.mockReturnValue(false);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const appearanceSection = el.querySelectorAll('.app-settings__section')[0];
      const toggleBtn = appearanceSection.querySelector('mat-slide-toggle button[role="switch"]') as HTMLElement;
      expect(toggleBtn.getAttribute('aria-checked')).toBe('false');
    });

    it('reduce motion toggle reflects effective state when system prefers reduced motion', () => {
      themeService.settings.mockReturnValue({ ...DEFAULT_SETTINGS, reduceMotion: null });
      themeService.effectiveReduceMotion.mockReturnValue(true);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const accessibilitySection = el.querySelectorAll('.app-settings__section')[1];
      const toggleBtns = accessibilitySection.querySelectorAll('mat-slide-toggle button[role="switch"]');
      expect(toggleBtns[0].getAttribute('aria-checked')).toBe('true');
    });

    it('high contrast toggle reflects effective state when system prefers high contrast', () => {
      themeService.settings.mockReturnValue({ ...DEFAULT_SETTINGS, highContrast: null });
      themeService.effectiveHighContrast.mockReturnValue(true);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const accessibilitySection = el.querySelectorAll('.app-settings__section')[1];
      const toggleBtns = accessibilitySection.querySelectorAll('mat-slide-toggle button[role="switch"]');
      expect(toggleBtns[1].getAttribute('aria-checked')).toBe('true');
    });
  });

  it('dispatches signOut action on sign out', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.signOut();
    expect(dispatchSpy).toHaveBeenCalledWith(authActions.signOutRequested());
  });
});
