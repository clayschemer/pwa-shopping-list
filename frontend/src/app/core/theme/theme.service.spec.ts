import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ThemeService, AppSettings, SETTINGS_STORAGE_KEY } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  function createMediaQueryList(matches: boolean): MediaQueryList {
    return {
      matches,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }

  function configureTestBed() {
    TestBed.configureTestingModule({
      imports: [provideTranslocoTesting()],
    });
  }

  beforeEach(() => {
    localStorage.clear();

    mockMatchMedia = vi.fn().mockImplementation((query: string) => {
      if (query === '(prefers-color-scheme: dark)') return createMediaQueryList(false);
      if (query === '(prefers-reduced-motion: reduce)') return createMediaQueryList(false);
      if (query === '(prefers-contrast: more)') return createMediaQueryList(false);
      return createMediaQueryList(false);
    });
    vi.stubGlobal('matchMedia', mockMatchMedia);

    document.documentElement.className = '';
    document.body.className = '';

    configureTestBed();
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('default settings', () => {
    it('should default language to EN', () => {
      expect(service.settings().language).toBe('EN');
    });

    it('should default currency to GBP', () => {
      expect(service.settings().currency).toBe('GBP');
    });

    it('should default keepScreenAwake to true', () => {
      expect(service.settings().keepScreenAwake).toBe(true);
    });

    it('should default leftHanded to false', () => {
      expect(service.settings().leftHanded).toBe(false);
    });

    it('should default compact to false', () => {
      expect(service.settings().compact).toBe(false);
    });

    it('should default hideCategoryGrouping to false', () => {
      expect(service.settings().hideCategoryGrouping).toBe(false);
    });

    it('should default showCheckedItems to false', () => {
      expect(service.settings().showCheckedItems).toBe(false);
    });

    it('should default hidePrices to false', () => {
      expect(service.settings().hidePrices).toBe(false);
    });

    it('should default darkMode to null (follow system)', () => {
      expect(service.settings().darkMode).toBeNull();
    });

    it('should default reduceMotion to null (follow system)', () => {
      expect(service.settings().reduceMotion).toBeNull();
    });

    it('should default highContrast to null (follow system)', () => {
      expect(service.settings().highContrast).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should persist settings to localStorage on update', () => {
      service.update({ language: 'NO' });
      const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!);
      expect(stored.language).toBe('NO');
    });

    it('should restore settings from localStorage on init', () => {
      const saved: Partial<AppSettings> = { language: 'SV', currency: 'SEK' };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(saved));

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('SV');
      expect(newService.settings().currency).toBe('SEK');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, 'not-json');
      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('EN');
    });

    it('should persist plan-filter toggles and restore them on reload', () => {
      service.update({ hideCategoryGrouping: true, showCheckedItems: true, hidePrices: true });
      const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!);
      expect(stored.hideCategoryGrouping).toBe(true);
      expect(stored.showCheckedItems).toBe(true);
      expect(stored.hidePrices).toBe(true);

      TestBed.resetTestingModule();
      configureTestBed();
      const reloaded = TestBed.inject(ThemeService);
      expect(reloaded.settings().hideCategoryGrouping).toBe(true);
      expect(reloaded.settings().showCheckedItems).toBe(true);
      expect(reloaded.settings().hidePrices).toBe(true);
    });
  });

  describe('theme class application', () => {
    it('should not apply dark class when darkMode is null', () => {
      service.update({ darkMode: null });
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    });

    it('should apply theme-dark when darkMode is true', () => {
      service.update({ darkMode: true });
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });

    it('should apply theme-light when darkMode is false', () => {
      service.update({ darkMode: false });
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    it('should apply theme-compact on body when compact is true', () => {
      service.update({ compact: true });
      expect(document.body.classList.contains('theme-compact')).toBe(true);
    });

    it('should remove theme-compact on body when compact is false', () => {
      service.update({ compact: true });
      service.update({ compact: false });
      expect(document.body.classList.contains('theme-compact')).toBe(false);
    });

    it('should apply theme-high-contrast on body when highContrast is true', () => {
      service.update({ highContrast: true });
      expect(document.body.classList.contains('theme-high-contrast')).toBe(true);
    });

    it('should apply theme-reduce-motion on body when reduceMotion is true', () => {
      service.update({ reduceMotion: true });
      expect(document.body.classList.contains('theme-reduce-motion')).toBe(true);
    });
  });

  describe('effective values (resolved with system preferences)', () => {
    it('should resolve darkMode to system preference when null', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-color-scheme: dark)') return createMediaQueryList(true);
        return createMediaQueryList(false);
      });
      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.effectiveDarkMode()).toBe(true);
    });

    it('should resolve reduceMotion to system preference when null', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') return createMediaQueryList(true);
        return createMediaQueryList(false);
      });
      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.effectiveReduceMotion()).toBe(true);
    });

    it('should use explicit value over system preference', () => {
      mockMatchMedia.mockImplementation((query: string) => {
        if (query === '(prefers-color-scheme: dark)') return createMediaQueryList(true);
        return createMediaQueryList(false);
      });
      service.update({ darkMode: false });
      expect(service.effectiveDarkMode()).toBe(false);
    });
  });

  describe('html lang attribute', () => {
    it('should set html lang attribute on init', () => {
      expect(document.documentElement.lang).toBe('en');
    });

    it('should update html lang attribute when language changes', () => {
      service.update({ language: 'SV' });
      expect(document.documentElement.lang).toBe('sv');
    });

    it('should set html lang from detected browser language on first load', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      TestBed.inject(ThemeService);
      expect(document.documentElement.lang).toBe('de');
    });
  });

  describe('system language detection', () => {
    it('should detect browser language and map to supported language on first load', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'sv-SE', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('SV');
    });

    it('should detect Norwegian Bokmål (nb) as NO', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'nb-NO', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('NO');
    });

    it('should detect Norwegian Nynorsk (nn) as NO', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'nn-NO', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('NO');
    });

    it('should fall back to EN for unsupported browser language', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('EN');
    });

    it('should detect German (de-DE) as DE', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('DE');
    });

    it('should detect French (fr-FR) as FR', () => {
      localStorage.clear();
      Object.defineProperty(navigator, 'language', { value: 'fr', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('FR');
    });

    it('should not override stored language with browser language', () => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ language: 'DE' }));
      Object.defineProperty(navigator, 'language', { value: 'fr', configurable: true });

      TestBed.resetTestingModule();
      configureTestBed();
      const newService = TestBed.inject(ThemeService);
      expect(newService.settings().language).toBe('DE');
    });
  });

  describe('update method', () => {
    it('should merge partial updates', () => {
      service.update({ language: 'DE' });
      service.update({ currency: 'EUR' });
      expect(service.settings().language).toBe('DE');
      expect(service.settings().currency).toBe('EUR');
    });
  });
});
