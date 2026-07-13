import { describe, expect, it } from 'vitest';
import { decimalToMinorUnits, minorUnitsToDecimal } from '../src/providers/amount';

describe('NPR amount conversion', () => {
  it('converts minor units without floating point arithmetic', () => {
    expect(minorUnitsToDecimal(12345)).toBe('123.45');
    expect(decimalToMinorUnits('123.45')).toBe(12345);
    expect(decimalToMinorUnits('1,000.5')).toBe(100050);
  });

  it('rejects invalid values', () => {
    expect(() => minorUnitsToDecimal(1.2)).toThrow();
    expect(() => decimalToMinorUnits('1.234')).toThrow();
  });
});
