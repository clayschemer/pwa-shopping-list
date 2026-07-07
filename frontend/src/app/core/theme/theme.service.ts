import { Injectable, signal, computed, DOCUMENT, inject, effect } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const SETTINGS_STORAGE_KEY = 'app-settings';

export type Language = 'EN' | 'NO' | 'SV' | 'DE' | 'FR' | 'DA';
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
  hideCategoryGrouping: boolean;
  showCheckedItems: boolean;
  hidePrices: boolean;
}

const LANGUAGE_MAP: Record<string, Language> = {
  en: 'EN',
  no: 'NO',
  nb: 'NO',
  nn: 'NO',
  sv: 'SV',
  de: 'DE',
  fr: 'FR',
  da: 'DA',
};

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: null,
  compact: false,
  reduceMotion: null,
  highContrast: null,
  leftHanded: false,
  language: 'EN',
  currency: 'GBP',
  keepScreenAwake: true,
  hideCategoryGrouping: false,
  showCheckedItems: false,
  hidePrices: false,
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
    this.setHtmlLang(this._settings().language);
    this.transloco.setActiveLang(this._settings().language.toLowerCase());

    effect(() => {
      const lang = this._settings().language;
      this.setHtmlLang(lang);
      this.transloco.setActiveLang(lang.toLowerCase());
    });
  }

  update(partial: Partial<AppSettings>): void {
    const next = { ...this._settings(), ...partial };
    this._settings.set(next);
    this.persistSettings(next);
    this.applyThemeClasses(next);
    this.setHtmlLang(next.language);
  }

  private loadSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS, language: this.detectBrowserLanguage() };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS, language: this.detectBrowserLanguage() };
    }
  }

  private detectBrowserLanguage(): Language {
    const browserLang = navigator?.language;
    if (!browserLang) return 'EN';
    const primary = browserLang.split('-')[0].toLowerCase();
    return LANGUAGE_MAP[primary] ?? 'EN';
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

    // Left-handed: mirrors shop-mode checkbox column to the leading edge
    body.classList.toggle('theme-left-handed', settings.leftHanded);
  }

  private setHtmlLang(language: Language): void {
    this.document.documentElement.lang = language.toLowerCase();
  }

  private queryMediaPreference(query: string): boolean {
    const window = this.document.defaultView;
    if (!window) return false;
    return window.matchMedia(query).matches;
  }
}
