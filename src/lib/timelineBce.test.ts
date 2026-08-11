import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '../types';
import { formatEraRange, formatItemDate, formatYearLabel } from './format';
import { filterItems, groupKeyOf, groupParts } from './timeline';

const idesOfMarch: TimelineItem = {
  id: 'test-ides-of-march',
  country: 'ancient-rome',
  year: -44,
  month: 3,
  day: 15,
  kind: 'event',
  title: 'Мартовские иды',
  summary: 'Тестовая карточка.',
  detail: 'Проверяет кодирование дат до нашей эры.',
  tags: [],
};

describe('BCE timeline dates', () => {
  it('uses an unambiguous group key at every granularity', () => {
    expect(groupKeyOf(idesOfMarch, 'year')).toBe('b44');
    expect(groupKeyOf(idesOfMarch, 'month')).toBe('b44-03');
    expect(groupKeyOf(idesOfMarch, 'day')).toBe('b44-03-15');
    expect(groupParts('b44-03-15')).toEqual([-44, 3, 15]);
  });

  it('formats signed years without exposing an implementation minus sign', () => {
    expect(formatYearLabel(-44)).toBe('44 до н. э.');
    expect(formatItemDate(idesOfMarch)).toBe('15 марта 44 до н. э.');
    expect(formatEraRange(-4_000, -800)).toBe('4 000–800 до н. э.');
  });

  it('can hide the entire BCE part without affecting Common Era events', () => {
    const commonEraItem = { ...idesOfMarch, id: 'test-common-era', year: 44 };
    const result = filterItems([idesOfMarch, commonEraItem], {
      layer: 'all',
      countries: ['ancient-rome'],
      query: '',
      tags: [],
      keyOnly: false,
      showBce: false,
    });

    expect(result.map((item) => item.id)).toEqual(['test-common-era']);
  });
});
