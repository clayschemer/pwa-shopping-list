import { Pipe, PipeTransform } from '@angular/core';
import { computePrice, PriceComputation } from '../../models/item-price.util';
import type { Item } from '../../models/item.model';

/** Computes the displayed price for an item — exact total, approximate shelf
 *  price (cross-dimension or unknown unit), or none. Templates should branch
 *  on `kind` and render exact totals through `MoneyPipe` and approximate
 *  prices via the `approxShelfPrice` translation.
 *  Pass shopId to resolve shop-specific price first; when absent the global
 *  price is used and `isGlobalFallback` is true on the result. */
@Pipe({ name: 'effectivePrice' })
export class EffectivePricePipe implements PipeTransform {
  transform(item: Item, shopId?: string | null): PriceComputation {
    return computePrice(item, shopId);
  }
}
