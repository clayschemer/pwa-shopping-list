import { describe, it, expect } from 'vitest';
import { ALL_ITEM_UNITS, getSelectableUnits } from './item-units';

describe('getSelectableUnits', () => {
  it('offers container in every language — a package is what shoppers buy, not its contents', () => {
    for (const lang of ['EN', 'NO', 'SV', 'DE', 'FR', 'DA'] as const) {
      expect(getSelectableUnits(lang)).toContain('container');
    }
  });

  it('lists every selectable unit in ALL_ITEM_UNITS', () => {
    for (const lang of ['EN', 'NO', 'SV', 'DE', 'FR', 'DA'] as const) {
      for (const unit of getSelectableUnits(lang)) {
        expect(ALL_ITEM_UNITS).toContain(unit);
      }
    }
  });

  it('includes dl for SI-based languages', () => {
    expect(getSelectableUnits('NO')).toContain('dl');
    expect(getSelectableUnits('SV')).toContain('dl');
    expect(getSelectableUnits('DE')).toContain('dl');
    expect(getSelectableUnits('FR')).toContain('dl');
    expect(getSelectableUnits('DA')).toContain('dl');
  });

  it('does not include dl for imperial-system languages', () => {
    expect(getSelectableUnits('EN')).not.toContain('dl');
  });
});
