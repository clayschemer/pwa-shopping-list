import { isDevMode } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { provideHttpClient } from '@angular/common/http';
import { TranslocoHttpLoader } from './transloco-loader';

export function provideAppTransloco() {
  return [
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['en', 'no', 'sv', 'de', 'fr'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ];
}
