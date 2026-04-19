import type { Language } from '../../core/theme/theme.service';

/** All units ever used — kept so existing items with any unit still render correctly. */
export const ALL_ITEM_UNITS = [
  'pcs', 'g', 'kg', 'mg', 'ml', 'L', 'cl',
  'bag', 'pack', 'box', 'can', 'bottle', 'jar', 'carton',
  'bunch', 'head', 'loaf', 'slice', 'sheet',
  'tsp', 'tbsp', 'cup', 'oz', 'lb',
  'fl oz', 'pt', 'qt', 'gal',
];

/** Units available in the dropdown for SI-based languages. */
const METRIC_UNITS = ['pcs', 'ml', 'L', 'g', 'kg'];

/** Additional imperial units shown for imperial-system languages. */
const IMPERIAL_UNITS = ['fl oz', 'cup', 'pt', 'qt', 'gal', 'oz', 'lb'];

const IMPERIAL_LANGUAGES: ReadonlySet<Language> = new Set(['EN']);

/**
 * Returns the units to show in the unit dropdown for a given language.
 * Metric languages see only pcs + ml/L + g/kg.
 * Imperial languages (EN) also see oz, lb, cup, etc.
 */
export function getSelectableUnits(language: Language): string[] {
  if (IMPERIAL_LANGUAGES.has(language)) {
    return [...METRIC_UNITS, ...IMPERIAL_UNITS];
  }
  return METRIC_UNITS;
}
