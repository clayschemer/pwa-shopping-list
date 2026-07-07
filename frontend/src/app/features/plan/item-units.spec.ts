import { describe, it, expect } from 'vitest';
import { getSelectableUnits } from './item-units';

describe('getSelectableUnits', () => {
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
