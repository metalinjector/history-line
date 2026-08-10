import { describe, expect, it } from 'vitest';
import { countries } from '../data/countries';
import { eras } from '../data/eras';
import type { TimelineItem } from '../types';
import { buildEditorialMatrix } from './editorialMetrics';

describe('buildEditorialMatrix', () => {
  it('counts editorial dimensions independently', () => {
    const item: TimelineItem = {
      id: 'x', country: 'france', year: 1789, month: 7, day: 14, kind: 'event',
      title: 'x', summary: 'x', detail: 'x', tags: [], importance: 3, body: '# article',
      sources: [
        { label: 'Archive', kind: 'archive' },
        { label: 'Encyclopedia', kind: 'encyclopedia' },
      ],
    };
    const matrix = buildEditorialMatrix([item], countries.map((country) => country.id), eras);
    expect(matrix.france['age-of-revolutions']).toEqual({
      total: 1, sourced: 1, articles: 1, exactDates: 1, milestones: 1,
    });
    expect(matrix.germany['age-of-revolutions'].total).toBe(0);
  });
});
