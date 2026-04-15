import { Injectable, signal, computed, DOCUMENT, inject, effect } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const SETTINGS_STORAGE_KEY = 'app-settings';

export type Language = 'EN' | 'NO' | 'SV' | 'DE' | 'FR';
export type Currency = 'GBP' | 'USD' | 'EUR' | 'NOK' | 'SEK' | 'DKK';

export interface AppSettings {
  darkMode: boolean | null;
  compact: boolean;
  reduceMotion: boolean | null;
  highContrast: boolean | null;
  leftHanded: boolean;
  language: Language;
  currency: Currency;
  keepScreenAwake: boolean;
}

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

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly _settings = signal<AppSettings>(this.loadSettings());

  readonly settings = this._settings.asReadonly();

  readonly effectiveDarkMode = computed(() => {
    const explicit = this._settings().darkMode;
    if (explicit !== null) return explicit;
    return this.queryMediaPreference('(prefers-color-scheme: dark)');
  });

  readonly effectiveReduceMotion = computed(() => {
    const explicit = this._settings().reduceMotion;
    if (explicit !== null) return explicit;
    return this.queryMediaPreference('(prefers-reduced-motion: reduce)');
  });

  readonly effectiveHighContrast = computed(() => {
    const explicit = this._settings().highContrast;
    if (explicit !== null) return explicit;
    return this.queryMediaPreference('(prefers-contrast: more)');
  });

  constructor() {
    this.applyThemeClasses(this._settings());
    this.transloco.setActiveLang(this._settings().language.toLowerCase());

    effect(() => {
      const lang = this._settings().language.toLowerCase();
      this.transloco.setActiveLang(lang);
    });
  }

  update(partial: Partial<AppSettings>): void {
    const next = { ...this._settings(), ...partial };
    this._settings.set(next);
    this.persistSettings(next);
    this.applyThemeClasses(next);
  }

  private loadSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  private applyThemeClasses(settings: AppSettings): void {
    const html = this.document.documentElement;
    const body = this.document.body;

    // Dark mode: null = system (no class), true = dark, false = light
    html.classList.remove('theme-dark', 'theme-light');
    if (settings.darkMode === true) {
      html.classList.add('theme-dark');
    } else if (settings.darkMode === false) {
      html.classList.add('theme-light');
    }

    // Compact
    body.classList.toggle('theme-compact', settings.compact);

    // High contrast: null = system (CSS media query handles it), true = force on
    body.classList.toggle('theme-high-contrast', settings.highContrast === true);

    // Reduce motion: null = system (CSS media query handles it), true = force on
    body.classList.toggle('theme-reduce-motion', settings.reduceMotion === true);
  }

  private queryMediaPreference(query: string): boolean {
    const window = this.document.defaultView;
    if (!window) return false;
    return window.matchMedia(query).matches;
  }
}
