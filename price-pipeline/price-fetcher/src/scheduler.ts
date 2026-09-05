import { queryQueuedItems, getShopConfigs } from './query.js';
import { writeShopPriceResult, writeGlobalPrice, writeAttemptTimestamp, dequeueItem } from './writer.js';
import { processItem } from './pipeline.js';
import type { StaleItem } from './types.js';

const INTERVAL_MS = (() => {
  const sec = process.env['SCAN_INTERVAL_SECONDS'];
  if (sec) return parseInt(sec, 10) * 1_000;
  const min = parseInt(process.env['SCAN_INTERVAL_MINUTES'] ?? '30', 10);
  return min * 60_000;
})();

// Politeness delay between items — avoids hammering the same store
const ITEM_DELAY_MS = 2_500;

async function runCycle(): Promise<void> {
  console.log(`\n[${ts()}] Checking price queue…`);

  const items = await queryQueuedItems();
  if (items.length === 0) {
    console.log(`  Queue empty.`);
    return;
  }

  console.log(`  ${items.length} item(s) queued.\n`);

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

      const matches = await processItem(item, shops);

      if (matches.length > 0) {
        for (const { result, shop, searchUrl } of matches) {
          const unitStr = result.priceUnit
            ? `/${result.priceQuantity ?? ''}${result.priceUnit}`
            : '';
          const sppStr = result.sizePerPiece
            ? `  [≈ ${result.sizePerPiece.quantity} ${result.sizePerPiece.unit}/st]`
            : '';
          console.log(`  ✓  ${result.price} kr${unitStr}${sppStr}  (${shop.name})`);
          await writeShopPriceResult(accountId, item.id, result, shop.id, searchUrl);
          await delay(ITEM_DELAY_MS);
        }
        await writeGlobalPrice(accountId, item.id);
        await dequeueItem(accountId, item.id);
      } else {
        console.log(`  ✗  No price found — will retry in ${process.env['PRICE_RETRY_DAYS'] ?? 7} days.`);
        // Stamp attempt time so the retry window is respected. Item stays in
        // the queue; the next cycle will skip it until the window expires.
        await writeAttemptTimestamp(accountId, item.id);
      }

      await delay(ITEM_DELAY_MS);
    }
  }

  console.log(`\n[${ts()}] Cycle complete.`);
}

export async function start(): Promise<void> {
  const intervalLabel = INTERVAL_MS < 60_000
    ? `${Math.round(INTERVAL_MS / 1_000)} s`
    : `${Math.round(INTERVAL_MS / 60_000)} min`;
  console.log(`Price scheduler started (interval: ${intervalLabel}).`);

  await tick();

  setInterval(tick, INTERVAL_MS);

  // Keep the process alive
  process.stdin.resume();
}

async function tick(): Promise<void> {
  try {
    await runCycle();
  } catch (err) {
    console.error(`[${ts()}] Cycle error:`, (err as Error).message);
  }
}

const ts = () => new Date().toISOString();
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
