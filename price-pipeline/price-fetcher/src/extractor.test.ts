import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extract } from './extractor.js';

const wrap = (json: unknown): string =>
  `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;

test('extract: captures url from product-level JSON-LD', () => {
  const html = wrap({
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'Product',
        name: 'Lime',
        url: 'https://shop.example/lime',
        offers: { price: 4.5 },
      },
    ],
  });

  const products = extract(html);

  assert.equal(products.length, 1);
  assert.equal(products[0].url, 'https://shop.example/lime');
});

test('extract: falls back to ItemList element url when product has none', () => {
  const html = wrap({
    '@type': 'ItemList',
    itemListElement: [
      {
        url: 'https://shop.example/list-entry',
        item: {
          '@type': 'Product',
          name: 'Banana',
          offers: { price: 12.9 },
        },
      },
    ],
  });

  const products = extract(html);

  assert.equal(products.length, 1);
  assert.equal(products[0].url, 'https://shop.example/list-entry');
});

test('extract: url is null when no source provides one', () => {
  const html = wrap({
    '@type': 'Product',
    name: 'Mjölk',
    offers: { price: 15.5 },
  });

  const products = extract(html);

  assert.equal(products.length, 1);
  assert.equal(products[0].url, null);
});

test('extract: returns empty array when JSON-LD is absent', () => {
  const products = extract('<html><body>no structured data</body></html>');
  assert.deepEqual(products, []);
});

test('extract: skips malformed JSON-LD blocks without throwing', () => {
  const html =
    '<script type="application/ld+json">{not valid json</script>' +
    wrap({
      '@type': 'Product',
      name: 'Egg',
      url: 'https://shop.example/egg',
      offers: { price: 30 },
    });

  const products = extract(html);

  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Egg');
});
