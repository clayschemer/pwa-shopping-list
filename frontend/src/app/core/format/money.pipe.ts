import { Pipe, PipeTransform, inject } from '@angular/core';
import { ThemeService } from '../theme/theme.service';
import { TranslocoService } from '@jsverse/transloco';

@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly theme = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);

  transform(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '';
    const currency = this.theme.settings().currency;
    const locale = this.transloco.getActiveLang() || 'en';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
