import type { ExtractedProduct, PriceResult } from './types.js';

const OLLAMA_URL = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
const MODEL = process.env['OLLAMA_MODEL'] ?? 'gemma2:2b';

interface GemmaOut {
  price: number | null;
  priceQuantity: number | null;
  priceUnit: string | null;
  matchedName?: string;
}

/**
 * Sends extracted products (or raw page text as fallback) to Gemma via Ollama.
 * description is passed as shopper context (brand exclusions, organic preference, etc.).
 * quantity and unit are intentionally excluded — they are purchase quantities, not
 * product size selectors, and passing them caused the LLM to calculate per-unit prices
 * instead of returning the actual listed shelf price.
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
      priceQuantity: parsed.priceQuantity ?? null,
      priceUnit: sanitiseUnit(parsed.priceUnit),
    };
  } catch {
    console.error('Could not parse Gemma response as JSON:\n', raw);
    return null;
  }
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
4. priceUnit is the physical package unit the price covers — e.g. "kg", "L", "st", "förp", "pack". NEVER use a currency ("kr", "SEK") as priceUnit. If the price covers a single item with no meaningful unit, set priceUnit to null.
5. priceQuantity is the number of that unit the listed price covers (e.g. 6 if the price is for a 6-pack).

Return ONLY valid JSON, nothing else:
{"price": <number or null>, "priceQuantity": <number or null>, "priceUnit": "<string or null>", "matchedName": "<string>"}

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
priceUnit is the physical package unit (kg, L, st, förp, pack) — NEVER a currency. Set to null if not applicable.

Return ONLY valid JSON, nothing else:
{"price": <number or null>, "priceQuantity": <number or null>, "priceUnit": "<string or null>", "matchedName": "<string>"}

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
