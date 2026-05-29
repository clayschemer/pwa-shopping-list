import { Pipe, PipeTransform } from '@angular/core';
import { effectivePrice } from '../../models/item-price.util';
import type { Item } from '../../models/item.model';

/** Computes the estimated purchase price for an item based on its quantity and the stored shelf price. */
@Pipe({ name: 'effectivePrice' })
export class EffectivePricePipe implements PipeTransform {
  transform(item: Item): number | null {
    return effectivePrice(item);
  }
}
