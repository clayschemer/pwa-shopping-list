import type { Language } from '../../core/theme/theme.service';

/** All units ever used — kept so existing items with any unit still render correctly. */
export const ALL_ITEM_UNITS = [
  'pcs', 'g', 'kg', 'mg', 'ml', 'L', 'cl', 'dl',
  'bag', 'pack', 'box', 'can', 'bottle', 'jar', 'carton',
  'bunch', 'head', 'loaf', 'slice', 'sheet',
  'tsp', 'tbsp', 'cup', 'oz', 'lb',
  'fl oz', 'pt', 'qt', 'gal',
];

/** Units available in the dropdown for imperial-system languages (no dl). */
const METRIC_UNITS = ['pcs', 'ml', 'L', 'g', 'kg'];

/** Units available in the dropdown for SI-unit languages — includes dl, not used in the imperial system. */
const SI_UNITS = ['pcs', 'ml', 'dl', 'L', 'g', 'kg'];

/** Additional imperial units shown for imperial-system languages. */
const IMPERIAL_UNITS = ['fl oz', 'cup', 'pt', 'qt', 'gal', 'oz', 'lb'];

const IMPERIAL_LANGUAGES: ReadonlySet<Language> = new Set(['EN']);

/**
 * Returns the units to show in the unit dropdown for a given language.
 * SI-unit languages see pcs + ml/dl/L + g/kg.
 * Imperial languages (EN) see pcs + ml/L + g/kg plus oz, lb, cup, etc. (no dl).
 */
export function getSelectableUnits(language: Language): string[] {
  if (IMPERIAL_LANGUAGES.has(language)) {
    return [...METRIC_UNITS, ...IMPERIAL_UNITS];
  }
  return SI_UNITS;
}
