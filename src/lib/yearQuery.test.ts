import { describe, expect, it } from 'vitest';
import { nearestGroupIndex, parseYearQuery } from './yearQuery';

const year = (value: number) => ({ from: value, to: value });

describe('parseYearQuery', () => {
  it('reads plain years of both eras', () => {
    expect(parseYearQuery('1812')).toEqual(year(1812));
    expect(parseYearQuery('  1812 г. ')).toEqual(year(1812));
    expect(parseYearQuery('1812 н. э.')).toEqual(year(1812));
    expect(parseYearQuery('-500')).toEqual(year(-500));
    expect(parseYearQuery('−500')).toEqual(year(-500));
    expect(parseYearQuery('500 до н. э.')).toEqual(year(-500));
    expect(parseYearQuery('500 г. до н.э.')).toEqual(year(-500));
    expect(parseYearQuery('500 до нэ')).toEqual(year(-500));
    expect(parseYearQuery('500 BC')).toEqual(year(-500));
    expect(parseYearQuery('3 000 000 до н. э.')).toEqual(year(-3_000_000));
  });

  it('has no year zero', () => {
    expect(parseYearQuery('0')).toEqual(year(1));
  });

  it('reads centuries and decades as whole spans', () => {
    expect(parseYearQuery('XVII век')).toEqual({ from: 1601, to: 1700 });
    expect(parseYearQuery('17 в.')).toEqual({ from: 1601, to: 1700 });
    expect(parseYearQuery('20-й век')).toEqual({ from: 1901, to: 2000 });
    expect(parseYearQuery('V в. до н. э.')).toEqual({ from: -500, to: -401 });
    expect(parseYearQuery('1990-е')).toEqual({ from: 1990, to: 1999 });
    expect(parseYearQuery('390-е до н. э.')).toEqual({ from: -399, to: -390 });
  });

  it('reads deep time in thousands and millions', () => {
    expect(parseYearQuery('3 млн')).toEqual(year(-3_000_000));
    expect(parseYearQuery('2,5 млн лет')).toEqual(year(-2_500_000));
    expect(parseYearQuery('40 тыс. лет назад', 2026)).toEqual(year(-37_975));
    expect(parseYearQuery('1 тыс. лет назад', 2026)).toEqual(year(1026));
  });

  it('rejects what is not a year', () => {
    expect(parseYearQuery('')).toBeUndefined();
    expect(parseYearQuery('революция')).toBeUndefined();
    expect(parseYearQuery('12.06.1812')).toBeUndefined();
  });
});

describe('nearestGroupIndex', () => {
  const groups = [{ year: -500 }, { year: 1789 }, { year: 1812 }, { year: 1812 }, { year: 1815 }];

  it('finds the exact year, first of several groups', () => {
    expect(nearestGroupIndex(groups, year(1812))).toBe(2);
  });

  it('falls back to the nearest group, the earlier one on a tie', () => {
    expect(nearestGroupIndex(groups, year(1813))).toBe(2);
    expect(nearestGroupIndex(groups, year(1814))).toBe(4);
    expect(nearestGroupIndex(groups, year(1800))).toBe(1);
    expect(nearestGroupIndex(groups, year(-3_000_000))).toBe(0);
    expect(nearestGroupIndex(groups, year(2024))).toBe(4);
  });

  it('prefers the first group inside a century over a closer one outside', () => {
    expect(nearestGroupIndex(groups, { from: 1801, to: 1900 })).toBe(2);
    expect(nearestGroupIndex(groups, { from: 1701, to: 1800 })).toBe(1);
    // Внутри XVI века пусто: ближайшая отметка — 1789, а не −500.
    expect(nearestGroupIndex(groups, { from: 1501, to: 1600 })).toBe(1);
  });

  it('handles an empty selection', () => {
    expect(nearestGroupIndex([], year(1812))).toBe(-1);
  });
});
