import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Guard test: every user-facing string lives in ALL locale files.
// A key present in one locale but missing in another ships blank UI
// for users on that language — this spec turns that into a test failure.

const LOCALES = ['en', 'no', 'sv', 'de', 'fr', 'da'] as const;

// Vitest runs with cwd = frontend/
const i18nDir = resolve(process.cwd(), 'public/assets/i18n') + '/';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function loadKeys(locale: string): Set<string> {
  const raw = readFileSync(`${i18nDir}${locale}.json`, 'utf8');
  return new Set(flattenKeys(JSON.parse(raw) as Record<string, unknown>));
}

describe('i18n key parity', () => {
  const keysByLocale = new Map(LOCALES.map((l) => [l, loadKeys(l)]));
  const reference = keysByLocale.get('en')!;

  it('en.json is non-empty', () => {
    expect(reference.size).toBeGreaterThan(0);
  });

  for (const locale of LOCALES.filter((l) => l !== 'en')) {
    it(`${locale}.json has exactly the same keys as en.json`, () => {
      const keys = keysByLocale.get(locale)!;
      const missing = [...reference].filter((k) => !keys.has(k));
      const extra = [...keys].filter((k) => !reference.has(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  }
});
