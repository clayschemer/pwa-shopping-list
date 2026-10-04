import { chromium } from 'playwright';
import type { ScrapeResult } from './types.js';

// Common GDPR cookie consent selectors across Swedish/EU sites
const CONSENT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '[data-testid="accept-all-cookies"]',
  '[data-testid="cookie-accept-all"]',
  '.cookie-consent__accept',
  'button[class*="accept-all"]',
  'button[id*="acceptAll"]',
];

export async function scrape(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'sv-SE',
      extraHTTPHeaders: { 'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8' },
    });

    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });

    // Dismiss cookie consent if it appeared
    for (const selector of CONSENT_SELECTORS) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(600);
        break;
      }
    }

    // Allow any post-consent re-renders to settle
    await page.waitForTimeout(1200);

    const html = await page.content();

    const text = await page.evaluate(() => {
      // Strip non-content elements before extracting text
      document
        .querySelectorAll('script, style, noscript, nav, footer, header, [aria-hidden="true"]')
        .forEach(el => el.remove());
      return (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
    });

    return { url, html, text: text.slice(0, 5000) };
  } finally {
    await browser.close();
  }
}
