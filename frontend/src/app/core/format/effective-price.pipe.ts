import { Pipe, PipeTransform } from '@angular/core';
import { computePrice, PriceComputation } from '../../models/item-price.util';
import type { Item } from '../../models/item.model';

/** Computes the displayed price for an item — exact total, approximate shelf
 *  price (cross-dimension or unknown unit), or none. Templates should branch
 *  on `kind` and render exact totals through `MoneyPipe` and approximate
 *  prices via the `approxShelfPrice` translation. */
@Pipe({ name: 'effectivePrice' })
export class EffectivePricePipe implements PipeTransform {
  transform(item: Item): PriceComputation {
    return computePrice(item);
  }
}
