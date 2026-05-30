import type { ExtractedProduct, PriceResult, SizePerPiece } from './types.js';

const OLLAMA_URL = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
const MODEL = process.env['OLLAMA_MODEL'] ?? 'gemma2:2b';

const SIZE_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l']);

interface GemmaSize {
  quantity?: number | null;
  unit?: string | null;
}

interface GemmaOut {
  price: number | null;
  priceQuantity: number | null;
  priceUnit: string | null;
  sizePerPiece?: GemmaSize | null;
  matchedName?: string;
}

/**
 * Sends extracted products (or raw page text as fallback) to Gemma via Ollama.
 * description is passed as shopper context (brand exclusions, organic preference, etc.).
 * quantity and unit are intentionally excluded — they are purchase quantities, not
 * product size selectors, and passing them caused the LLM to calculate per-unit prices
 * instead of returning the actual listed shelf price.
 *
 * priceUnit and priceQuantity are always populated when price is set — the frontend
 * needs both to compute the displayed total. Defaults: priceUnit='pcs', priceQuantity=1.
 */
export async function validate(
  itemName: string,
  products: ExtractedProduct[],
  pageText: string,
  description?: string | null,
): Promise<PriceResult | null> {
  const prompt = products.length > 0
    ? structuredPrompt(itemName, products, description)
    : textPrompt(itemName, pageText, description);

  const raw = await generate(prompt);

  try {
    const parsed = JSON.parse(raw) as GemmaOut;
    if (parsed.price === null || typeof parsed.price !== 'number' || !isFinite(parsed.price) || parsed.price <= 0) {
      return null;
    }
    return {
      price: parsed.price,
      priceQuantity: parsed.priceQuantity ?? 1,
      priceUnit: sanitiseUnit(parsed.priceUnit) ?? 'pcs',
      sizePerPiece: sanitiseSize(parsed.sizePerPiece),
    };
  } catch {
    console.error('Could not parse Gemma response as JSON:\n', raw);
    return null;
  }
}

function sanitiseSize(raw: GemmaSize | null | undefined): SizePerPiece | null {
  if (!raw) return null;
  const qty = raw.quantity;
  const unit = raw.unit;
  if (typeof qty !== 'number' || !isFinite(qty) || qty <= 0) return null;
  if (typeof unit !== 'string' || !SIZE_UNITS.has(unit.toLowerCase().trim())) {
    return null;
  }
  return { quantity: qty, unit: unit.trim() };
}

function structuredPrompt(
  itemName: string,
  products: ExtractedProduct[],
  description?: string | null,
): string {
  const descHint = description ? `\nNotes from the shopper: "${description}"` : '';

  const list = products
    .slice(0, 15)
    .map(p => {
      const qty = p.priceQuantity ? ` ${p.priceQuantity}` : '';
      const u = p.priceUnit ? `${p.priceUnit}` : '';
      return `- "${p.name}": ${p.price} kr${qty ? ` / ${qty}${u}` : ''}`;
    })
    .join('\n');

  return `You are a grocery price assistant.

Item to find: "${itemName}".${descHint}

Products from the store:
${list}

Rules:
1. Select the product whose name best matches "${itemName}".
2. Apply any notes from the shopper (e.g. brand exclusions, organic preference) when choosing.
3. Return the price EXACTLY AS LISTED. Do not calculate, divide, or multiply prices.
4. priceUnit is the physical package unit the price covers — e.g. "kg", "L", "st", "förp", "pack". NEVER use a currency ("kr", "SEK") as priceUnit. If the price covers a single item with no meaningful unit, set priceUnit to "pcs".
5. priceQuantity is the number of that unit the listed price covers (e.g. 6 if the price is for a 6-pack). If a price covers a single piece or package, set priceQuantity to 1.
6. priceUnit and priceQuantity must be set whenever price is set — never null.
7. sizePerPiece is the typical size of ONE PIECE for items that shoppers usually buy by piece even though the shelf prices them by weight or volume (e.g. lime ≈ 70 g, banana ≈ 120 g, egg ≈ 60 g, loaf of bread ≈ 500 g, carton of milk ≈ 1 L). Set { "quantity": <number>, "unit": "g"|"kg"|"ml"|"cl"|"dl"|"L" }. Use null when the item is not typically sold by piece (rice, oil, pasta), or when you are not confident.

Return ONLY valid JSON, nothing else:
{"price": <number or null>, "priceQuantity": <number>, "priceUnit": "<string>", "sizePerPiece": {"quantity": <number>, "unit": "<string>"} | null, "matchedName": "<string>"}

If no product is a reasonable match, set price to null.`;
}

function textPrompt(
  itemName: string,
  pageText: string,
  description?: string | null,
): string {
  const descHint = description ? `\nShopper notes: "${description}"` : '';

  return `You are a grocery price assistant.

Item to find: "${itemName}"${descHint}

Raw text from a Swedish grocery store search page:
${pageText}

Find the price for "${itemName}" in this text. Apply any shopper notes when selecting.
Prices are in Swedish kronor (kr/SEK). Price formats: "29,90 kr", "29.90", "29:-", "2 för 49 kr".
Return the price EXACTLY AS LISTED. Do not calculate, divide, or multiply.
priceUnit is the physical package unit (kg, L, st, förp, pack) — NEVER a currency. Use "pcs" if the price covers a single piece with no meaningful unit.
priceQuantity is the number of that unit the listed price covers (1 for a single piece or package).
priceUnit and priceQuantity must be set whenever price is set — never null.
sizePerPiece is the typical size of ONE PIECE for items shoppers usually buy by piece but the shelf prices by weight or volume (e.g. lime ≈ 70 g, egg ≈ 60 g, milk carton ≈ 1 L). Set {"quantity": <number>, "unit": "g"|"kg"|"ml"|"cl"|"dl"|"L"} or null when not applicable.

Return ONLY valid JSON, nothing else:
{"price": <number or null>, "priceQuantity": <number>, "priceUnit": "<string>", "sizePerPiece": {"quantity": <number>, "unit": "<string>"} | null, "matchedName": "<string>"}

If not found, set price to null.`;
}

const CURRENCY_TOKENS = new Set(['kr', 'sek', 'eur', 'usd', 'gbp', 'nok', 'dkk', ':-', 'kronor']);

function sanitiseUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  return CURRENCY_TOKENS.has(unit.toLowerCase().trim()) ? null : unit;
}

async function generate(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { response: string };
  return data.response;
}
