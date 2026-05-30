import { queryStaleItems, getShopConfigs } from './query.js';
import { writePriceResult, writeAttemptTimestamp } from './writer.js';
import { processItem } from './pipeline.js';
import type { StaleItem } from './types.js';

const INTERVAL_MIN = parseInt(process.env['SCAN_INTERVAL_MINUTES'] ?? '30', 10);
// Politeness delay between items — avoids hammering the same store
const ITEM_DELAY_MS = 2_500;

async function runCycle(mode: 'full' | 'unpriced'): Promise<void> {
  console.log(`\n[${ts()}] Starting ${mode} scan…`);

  const items = await queryStaleItems(mode);
  if (items.length === 0) {
    console.log(`  No items to process.`);
    return;
  }

  console.log(`  ${items.length} item(s) found.\n`);

  // Group by account to avoid re-fetching shop config per item
  const byAccount = new Map<string, StaleItem[]>();
  for (const item of items) {
    const list = byAccount.get(item.accountId) ?? [];
    list.push(item);
    byAccount.set(item.accountId, list);
  }

  for (const [accountId, accountItems] of byAccount) {
    const shops = await getShopConfigs(accountId);
    if (shops.length === 0) {
      console.log(`[${accountId}] No shops with search URLs — skipping.`);
      continue;
    }

    const shopNames = shops.map(s => s.name).join(', ');
    console.log(`[${accountId}] ${accountItems.length} item(s) · shops: ${shopNames}`);

    for (const item of accountItems) {
      const label = [item.name, item.quantity, item.unit].filter(Boolean).join(' ');
      console.log(`\n  "${label}"`);

      const found = await processItem(item, shops);

      if (found) {
        const { result, shop } = found;
        const unitStr = result.priceUnit
          ? `/${result.priceQuantity ?? ''}${result.priceUnit}`
          : '';
        const sppStr = result.sizePerPiece
          ? `  [≈ ${result.sizePerPiece.quantity} ${result.sizePerPiece.unit}/st]`
          : '';
        console.log(`  ✓  ${result.price} kr${unitStr}${sppStr}  (${shop.name})`);
        await writePriceResult(accountId, item.id, result, shop.id);
      } else {
        console.log(`  ✗  No price found — will retry in ${process.env['PRICE_RETRY_DAYS'] ?? 7} days.`);
        await writeAttemptTimestamp(accountId, item.id);
      }

      await delay(ITEM_DELAY_MS);
    }
  }

  console.log(`\n[${ts()}] Cycle complete.`);
}

let lastFullRunAt = 0;

async function tick(): Promise<void> {
  try {
    await runCycle('unpriced');

    // Run a full stale-price sweep once per day, starting at or after 02:00 UTC
    const hourUTC = new Date().getUTCHours();
    const sinceLastFull = Date.now() - lastFullRunAt;
    if (hourUTC >= 2 && sinceLastFull > 20 * 3_600_000) {
      await runCycle('full');
      lastFullRunAt = Date.now();
    }
  } catch (err) {
    console.error(`[${ts()}] Cycle error:`, (err as Error).message);
  }
}

export async function start(): Promise<void> {
  console.log(`Price scheduler started (interval: ${INTERVAL_MIN} min, stale threshold: ${process.env['PRICE_STALE_DAYS'] ?? 180} days).`);

  await tick();

  setInterval(tick, INTERVAL_MIN * 60_000);

  // Keep the process alive
  process.stdin.resume();
}

const ts = () => new Date().toISOString();
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
