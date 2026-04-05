import { Injectable, signal, effect } from '@angular/core';

export type Language = 'en' | 'no' | 'sv' | 'de' | 'fr';
export type Currency = 'GBP' | 'USD' | 'EUR' | 'NOK' | 'SEK' | 'DKK';

export interface AppSettings {
  language: Language;
  currency: Currency;
  darkMode: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
  keepScreenAwake: boolean;
  leftHandedMode: boolean;
}

const STORAGE_KEY = 'app-settings';

function systemPrefers(media: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(media).matches;
}

const defaults: AppSettings = {
  language: 'en',
  currency: 'GBP',
  darkMode: systemPrefers('(prefers-color-scheme: dark)'),
  highContrast: systemPrefers('(prefers-contrast: more)'),
  reduceMotion: systemPrefers('(prefers-reduced-motion: reduce)'),
  compactMode: false,
  keepScreenAwake: true,
  leftHandedMode: false,
};

/**
 * Device-local settings service. Reads/writes localStorage.
 * Stateful — signals for reactive consumption. No mixing with account-level state.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _settings = signal<AppSettings>(this.load());

  readonly settings = this._settings.asReadonly();

  constructor() {
    // Persist on every change
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings()));
    });
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this._settings.update((s) => ({ ...s, [key]: value }));
  }

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }
}
