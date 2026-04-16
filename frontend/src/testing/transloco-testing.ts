import { TranslocoTestingModule } from '@jsverse/transloco';
import en from '../../public/assets/i18n/en.json';

/**
 * Provides Transloco configured for unit tests.
 * Loads the English translation file so pipes resolve to real strings.
 */
export function provideTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: { en },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
    },
  });
}
