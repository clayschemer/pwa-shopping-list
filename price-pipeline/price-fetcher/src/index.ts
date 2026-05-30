import { buildSearchUrl, KNOWN_STORES } from './search-query.js';
import { scrape } from './scraper.js';
import { extract } from './extractor.js';
import { validate } from './validator.js';

// Scheduler mode is imported lazily to avoid loading firebase-admin in manual mode
type Mode = 'manual' | 'scheduler' | 'once-full' | 'once-unpriced' | 'reset-item';

interface Args {
  mode: Mode;
  item: string;
  itemId?: string;
  accountId?: string;
  url?: string;
  site?: string;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { mode: 'manual', item: '', help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--help': case '-h':    args.help = true; break;
      case '--item':               args.item = argv[++i] ?? ''; break;
      case '--item-id':            args.itemId = argv[++i]; break;
      case '--account-id':         args.accountId = argv[++i]; break;
      case '--url':                args.url  = argv[++i]; break;
      case '--site':               args.site = argv[++i]; break;
      case '--mode':               args.mode = (argv[++i] ?? 'manual') as Mode; break;
    }
  }
  return args;
}

function printHelp(): void {
  const storeList = Object.keys(KNOWN_STORES).join(', ');
  console.log(`
price-fetcher

Usage:
  npx tsx src/index.ts [--mode <mode>] [options]

Modes:
  manual           Scrape and validate a single item (default)
  scheduler        Long-running: scans Firestore periodically (requires Firebase credentials)
  once-unpriced    Single pass for unpriced items then exits (requires Firebase credentials)
  once-full        Single stale-price sweep then exits (requires Firebase credentials)

Options (manual mode):
  --item <name>     Item to search for (required)
  --url <template>  URL with {query} placeholder (overrides --site)
  --site <name>     Known store: ${storeList}
                    Note: ICA requires a store-specific URL — add to stores.json
  --help            Show this message

Environment:
  OLLAMA_URL              Ollama base URL (default: http://localhost:11434)
  OLLAMA_MODEL            Model name    (default: gemma2:2b)
  GOOGLE_APPLICATION_CREDENTIALS  Path to Firebase service account JSON (scheduler modes)
  PRICE_STALE_DAYS        Days before a price is considered stale (default: 180)
  SCAN_INTERVAL_MINUTES   How often the scheduler checks for unpriced items (default: 30)

Examples:
  npx tsx src/index.ts --item "mellanmjölk 1l" --site ica
  npx tsx src/index.ts --item "pasta" --url "https://www.willys.se/search?q={query}"
  npx tsx src/index.ts --mode scheduler
  npx tsx src/index.ts --mode once-unpriced
  `);
}

async function runManual(args: Args): Promise<void> {
  const item = { name: args.item };
  const searchUrl = buildSearchUrl(item, args.url, args.site);

  console.log(`\nItem:  "${args.item}"`);
  console.log(`URL:   ${searchUrl}\n`);

  process.stdout.write('Scraping page... ');
  const { html, text, url } = await scrape(searchUrl);
  console.log('done.');

  process.stdout.write('Extracting JSON-LD structured data... ');
  const products = extract(html);
  console.log(`${products.length} product(s) found.`);

  if (products.length > 0) {
    console.log('\nExtracted products (first 5):');
    products.slice(0, 5).forEach(p => {
      const unit = p.priceUnit ? `/${p.priceUnit}` : '';
      console.log(`  • ${p.name}: ${p.price} kr${unit}`);
    });
    if (products.length > 5) console.log(`  … and ${products.length - 5} more`);
  } else {
    console.log('  → No structured data; falling back to raw text analysis.');
    console.log(`  → Page text sample: "${text.slice(0, 200)}…"`);
  }

  process.stdout.write('\nAsking Gemma to validate... ');
  const result = await validate(args.item, products, text);
  console.log('done.\n');

  console.log('━━━ RESULT ━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (result) {
    console.log(`Price:    ${result.price} kr`);
    if (result.priceQuantity != null) console.log(`Quantity: ${result.priceQuantity}`);
    if (result.priceUnit)             console.log(`Unit:     ${result.priceUnit}`);
    if (result.sizePerPiece)          console.log(`Per piece: ${result.sizePerPiece.quantity} ${result.sizePerPiece.unit}`);
    console.log(`Source:   ${url}`);
  } else {
    console.log('No price found. Consider trying a different --site or --url.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function runResetItem(itemId: string, accountId: string): Promise<void> {
  const { resetPriceForRescan } = await import('./writer.js');
  await resetPriceForRescan(accountId, itemId);
  console.log(`Reset ${itemId} — will be picked up by next unpriced scan.`);
}

async function runFirestoreMode(mode: 'scheduler' | 'once-full' | 'once-unpriced'): Promise<void> {
  // Dynamic import keeps firebase-admin out of the manual-mode bundle
  if (mode === 'scheduler') {
    const { start } = await import('./scheduler.js');
    await start();
  } else {
    const { queryStaleItems, getShopConfigs } = await import('./query.js');
    const { writePriceResult, writeAttemptTimestamp } = await import('./writer.js');
    const { processItem } = await import('./pipeline.js');

    const scanMode = mode === 'once-full' ? 'full' : 'unpriced';
    const items = await queryStaleItems(scanMode);
    console.log(`Found ${items.length} item(s) for ${scanMode} scan.`);

    for (const item of items) {
      const shops = await getShopConfigs(item.accountId);
      const found = await processItem(item, shops);
      if (found) {
        console.log(`✓ "${item.name}": ${found.result.price} kr (${found.shop.name})`);
        await writePriceResult(item.accountId, item.id, found.result, found.shop.id);
      } else {
        console.log(`✗ "${item.name}": no price found — will retry in ${process.env['PRICE_RETRY_DAYS'] ?? 7} days.`);
        await writeAttemptTimestamp(item.accountId, item.id);
      }
    }
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.mode === 'manual') {
  if (!args.item) {
    printHelp();
    process.exit(1);
  }
  runManual(args).catch(err => {
    console.error('\nFatal error:', (err as Error).message);
    process.exit(1);
  });
} else if (args.mode === 'reset-item') {
  if (!args.itemId || !args.accountId) {
    console.error('reset-item requires --item-id <id> and --account-id <id>');
    process.exit(1);
  }
  runResetItem(args.itemId, args.accountId).catch(err => {
    console.error('\nFatal error:', (err as Error).message);
    process.exit(1);
  });
} else {
  runFirestoreMode(args.mode).catch(err => {
    console.error('\nFatal error:', (err as Error).message);
    process.exit(1);
  });
}
