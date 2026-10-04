import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HapticsService } from './haptics.service';

describe('HapticsService', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;
  const originalVibrate = (navigator as Navigator & { vibrate?: unknown }).vibrate;

  beforeEach(() => {
    vibrateSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrateSpy,
    });
  });

  afterEach(() => {
    if (originalVibrate === undefined) {
      delete (navigator as Navigator & { vibrate?: unknown }).vibrate;
    } else {
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        writable: true,
        value: originalVibrate,
      });
    }
    vi.restoreAllMocks();
  });

  function createService(): HapticsService {
    return TestBed.runInInjectionContext(() => new HapticsService());
  }

  it('checkConfirm() triggers a noticeable single vibration', () => {
    const service = createService();
    service.checkConfirm();
    expect(vibrateSpy).toHaveBeenCalledTimes(1);
    const [pattern] = vibrateSpy.mock.calls[0] as [number[]];
    expect(Array.isArray(pattern)).toBe(true);
    expect(pattern).toHaveLength(1);
    expect(pattern[0]).toBeGreaterThanOrEqual(60);
  });

  it('vibrate() forwards an array pattern unchanged', () => {
    const service = createService();
    service.vibrate([30, 40, 30]);
    expect(vibrateSpy).toHaveBeenCalledWith([30, 40, 30]);
  });

  it('vibrate() wraps a numeric pattern in an array', () => {
    const service = createService();
    service.vibrate(50);
    expect(vibrateSpy).toHaveBeenCalledWith([50]);
  });

  it('is a no-op when navigator.vibrate is unavailable', () => {
    delete (navigator as Navigator & { vibrate?: unknown }).vibrate;
    const service = createService();
    expect(() => service.checkConfirm()).not.toThrow();
  });
});
