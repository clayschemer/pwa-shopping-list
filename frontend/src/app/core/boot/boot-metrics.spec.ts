import { describe, it, expect } from 'vitest';
import { formatBootCounter, PHASE_BASE, MILESTONE_WEIGHT } from './boot-metrics';

describe('boot metrics', () => {
  describe('formatBootCounter', () => {
    it('renders a file count and a human byte size', () => {
      expect(formatBootCounter(41, 1_600_000, 'en')).toBe('41 · 1.6 MB');
    });

    it('uses kB below a megabyte', () => {
      expect(formatBootCounter(3, 12_800, 'en')).toBe('3 · 12.8 kB');
    });

    it('uses bytes below a kilobyte', () => {
      expect(formatBootCounter(1, 512, 'en')).toBe('1 · 512 B');
    });

    /**
     * The counter carries no words, but numbers still need locale formatting —
     * a Swedish or German user expects a decimal comma.
     */
    it('formats the decimal separator for the active locale', () => {
      expect(formatBootCounter(41, 1_600_000, 'de')).toBe('41 · 1,6 MB');
      expect(formatBootCounter(41, 1_600_000, 'sv')).toBe('41 · 1,6 MB');
    });

    it('renders nothing until at least one resource has completed', () => {
      expect(formatBootCounter(0, 0, 'en')).toBe('');
    });

    it('falls back to en formatting for an unknown locale rather than throwing', () => {
      expect(formatBootCounter(2, 2048, 'not-a-locale')).toBe('2 · 2 kB');
    });
  });

  describe('progress weights', () => {
    it('reserves the pre-bootstrap segment for app code', () => {
      expect(PHASE_BASE).toBe(35);
    });

    it('the pre-boot base plus every milestone totals exactly 100', () => {
      const total = Object.values(MILESTONE_WEIGHT).reduce((a, b) => a + b, 0);
      expect(PHASE_BASE + total).toBe(100);
    });
  });
});
