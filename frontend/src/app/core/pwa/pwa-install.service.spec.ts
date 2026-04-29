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
});
