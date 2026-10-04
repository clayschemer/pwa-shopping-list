import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PwaInstallService, PwaInstallState } from './pwa-install.service';

describe('PwaInstallService', () => {
  let listeners: Record<string, EventListener>;

  beforeEach(() => {
    listeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
      listeners[type] = handler as EventListener;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService(standaloneMatch = false): PwaInstallService {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: standaloneMatch,
    } as unknown as MediaQueryList);

    return TestBed.runInInjectionContext(() => new PwaInstallService());
  }

  it('initial state is "unsupported" when not in standalone mode', () => {
    const service = createService(false);
    expect(service.state()).toBe('unsupported');
    expect(service.canInstall()).toBe(false);
  });

  it('initial state is "installed" when running in standalone mode', () => {
    const service = createService(true);
    expect(service.state()).toBe('installed');
  });

  it('transitions to "installable" on beforeinstallprompt', () => {
    const service = createService(false);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    listeners['beforeinstallprompt'](event);

    expect(service.state()).toBe('installable');
    expect(service.canInstall()).toBe(true);
  });

  it('transitions to "installed" on appinstalled', () => {
    const service = createService(false);
    // First make it installable
    const promptEvent = new Event('beforeinstallprompt', { cancelable: true });
    listeners['beforeinstallprompt'](promptEvent);

    // Then mark installed
    listeners['appinstalled'](new Event('appinstalled'));

    expect(service.state()).toBe('installed');
    expect(service.canInstall()).toBe(false);
  });

  it('install() returns false when no deferred prompt', async () => {
    const service = createService(false);
    const result = await service.install();
    expect(result).toBe(false);
  });

  it('install() triggers the deferred prompt and returns true on accept', async () => {
    const service = createService(false);

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const promptEvent = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    listeners['beforeinstallprompt'](promptEvent);

    const result = await service.install();

    expect(mockPrompt).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(service.state()).toBe('installed');
    expect(service.canInstall()).toBe(false);
  });

  it('install() returns false and sets unsupported on dismiss', async () => {
    const service = createService(false);

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const promptEvent = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    });
    listeners['beforeinstallprompt'](promptEvent);

    const result = await service.install();

    expect(result).toBe(false);
    expect(service.state()).toBe('unsupported');
  });

  describe('isIos', () => {
    it('returns false for non-iOS user agents', () => {
      const service = createService(false);
      // Default jsdom UA is not iOS
      expect(service.isIos).toBe(false);
    });
  });

  /**
   * `isInstalled` gates auto-add, which only runs when someone opens the app —
   * so it has to be true for every way the platform reports a launched-from-home
   * -screen app, not just `display-mode: standalone`.
   */
  describe('isInstalled', () => {
    /** Reports matches only for the given display modes. */
    function stubDisplayModes(modes: string[]): void {
      window.matchMedia = vi.fn((queryString: string) => {
        const mode = /\(display-mode:\s*([\w-]+)\)/.exec(queryString)?.[1] ?? '';
        return { matches: modes.includes(mode) } as unknown as MediaQueryList;
      });
    }

    function create(): PwaInstallService {
      return TestBed.runInInjectionContext(() => new PwaInstallService());
    }

    afterEach(() => {
      Object.defineProperty(navigator, 'standalone', {
        value: undefined,
        configurable: true,
      });
    });

    it('is false in a plain browser tab', () => {
      stubDisplayModes([]);
      expect(create().isInstalled()).toBe(false);
    });

    it('is true in standalone display mode', () => {
      stubDisplayModes(['standalone']);
      expect(create().isInstalled()).toBe(true);
    });

    it('is true in minimal-ui display mode', () => {
      stubDisplayModes(['minimal-ui']);
      expect(create().isInstalled()).toBe(true);
    });

    it('is true in window-controls-overlay display mode', () => {
      stubDisplayModes(['window-controls-overlay']);
      expect(create().isInstalled()).toBe(true);
    });

    /** iOS Safari reports no display mode at all and exposes this instead. */
    it('is true from the iOS standalone flag', () => {
      stubDisplayModes([]);
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        configurable: true,
      });
      expect(create().isInstalled()).toBe(true);
    });

    it('becomes true once the browser reports the app installed', () => {
      stubDisplayModes([]);
      const service = create();
      expect(service.isInstalled()).toBe(false);

      listeners['appinstalled'](new Event('appinstalled'));

      expect(service.isInstalled()).toBe(true);
    });

    /** Environments without the media-query API must not break construction. */
    it('does not throw when matchMedia is unavailable', () => {
      (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
      expect(() => create()).not.toThrow();
    });
  });
});
