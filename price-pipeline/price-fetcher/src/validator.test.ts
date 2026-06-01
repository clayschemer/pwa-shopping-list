import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from './validator.js';
import type { ExtractedProduct, FeedbackHint } from './types.js';

interface Capture {
  prompt: string;
}

const captured: Capture = { prompt: '' };
const originalFetch = globalThis.fetch;

function stubOllama(response: object): void {
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { prompt: string };
    captured.prompt = body.prompt;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ response: JSON.stringify(response) }),
    } as Response;
  }) as typeof fetch;
}

beforeEach(() => {
  captured.prompt = '';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const PRODUCT_A: ExtractedProduct = {
  name: 'ICA Lime Fresh',
  price: 4.9,
  priceQuantity: 1,
  priceUnit: 'st',
  url: 'https://shop.example/lime-fresh',
};

const PRODUCT_B: ExtractedProduct = {
  name: 'Festis Lime 250ml',
  price: 12,
  priceQuantity: 1,
  priceUnit: 'st',
  url: 'https://shop.example/festis-lime',
};

test('validate: includes category in the structured prompt', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'ICA Lime Fresh',
  });

  await validate('Lime', [PRODUCT_A, PRODUCT_B], '', null, 'Fruit', []);

  assert.match(captured.prompt, /Item category: "Fruit"/);
});

test('validate: includes feedback section listing prior rejections', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'ICA Lime Fresh',
  });

  const feedback: FeedbackHint[] = [
    {
      rejectedName: 'Festis Lime 250ml',
      rejectedUrl: 'https://shop.example/festis-lime',
      reason: 'this is a soft drink, I wanted the fruit',
    },
  ];

  await validate('Lime', [PRODUCT_A, PRODUCT_B], '', null, 'Fruit', feedback);

  assert.match(captured.prompt, /Previous user feedback/);
  assert.match(captured.prompt, /Festis Lime 250ml/);
  assert.match(captured.prompt, /this is a soft drink/);
});

test('validate: resolves productName and productUrl from matchedName', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'ICA Lime Fresh',
  });

  const result = await validate('Lime', [PRODUCT_A, PRODUCT_B], '', null, 'Fruit', []);

  assert.ok(result);
  assert.equal(result!.productName, 'ICA Lime Fresh');
  assert.equal(result!.productUrl, 'https://shop.example/lime-fresh');
});

test('validate: matchedName lookup is case- and whitespace-insensitive', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: '  ica lime fresh  ',
  });

  const result = await validate('Lime', [PRODUCT_A, PRODUCT_B], '', null, null, []);

  assert.ok(result);
  assert.equal(result!.productName, 'ICA Lime Fresh');
  assert.equal(result!.productUrl, 'https://shop.example/lime-fresh');
});

test('validate: productName falls back to LLM matchedName when JSON-LD resolution fails; productUrl stays null', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'something the LLM made up',
  });

  const result = await validate('Lime', [PRODUCT_A], '', null, null, []);

  assert.ok(result);
  // We keep the LLM-supplied name so the inspect UI still appears; the URL
  // requires a verified JSON-LD match and stays null.
  assert.equal(result!.productName, 'something the LLM made up');
  assert.equal(result!.productUrl, null);
});

test('validate: productName populates even when no JSON-LD products were extracted', async () => {
  stubOllama({
    price: 15,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'Persilja',
  });

  // products empty → text prompt path; LLM name still surfaces as productName.
  const result = await validate('Persilja', [], 'persilja 15 kr', null, null, []);

  assert.ok(result);
  assert.equal(result!.productName, 'Persilja');
  assert.equal(result!.productUrl, null);
});

test('validate: empty/whitespace matchedName yields null productName', async () => {
  stubOllama({
    price: 5,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: '   ',
  });

  const result = await validate('Item', [], 'text', null, null, []);

  assert.ok(result);
  assert.equal(result!.productName, null);
});

test('validate: text-prompt fallback also includes category and feedback', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'Lime',
  });

  const feedback: FeedbackHint[] = [
    { rejectedName: 'Lime cordial', rejectedUrl: null, reason: 'not the fruit' },
  ];

  // products empty → text prompt path
  await validate('Lime', [], 'lime 4,90 kr', null, 'Fruit', feedback);

  assert.match(captured.prompt, /Item category: "Fruit"/);
  assert.match(captured.prompt, /Previous user feedback/);
  assert.match(captured.prompt, /not the fruit/);
});

test('validate: empty/absent category and feedback render no extra sections', async () => {
  stubOllama({
    price: 4.9,
    priceQuantity: 1,
    priceUnit: 'st',
    sizePerPiece: null,
    matchedName: 'ICA Lime Fresh',
  });

  await validate('Lime', [PRODUCT_A], '', null, null, []);

  assert.doesNotMatch(captured.prompt, /Item category/);
  assert.doesNotMatch(captured.prompt, /Previous user feedback/);
});

test('validate: returns null when LLM returns null price', async () => {
  stubOllama({
    price: null,
    priceQuantity: null,
    priceUnit: null,
    sizePerPiece: null,
    matchedName: '',
  });

  const result = await validate('NonexistentItem', [PRODUCT_A], '', null, null, []);

  assert.equal(result, null);
});
