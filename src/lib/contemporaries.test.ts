import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '../types';
import { findContemporaries } from './contemporaries';

const item = (id: string, country: TimelineItem['country'], year: number, importance = 2): TimelineItem => ({
  id, country, year, kind: 'event', title: id, summary: id, detail: id, tags: [], importance: importance as 1 | 2 | 3,
});

describe('findContemporaries', () => {
  it('prioritizes the same year and spreads results across countries', () => {
    const reference = item('ref', 'germany', 1919);
    const result = findContemporaries(reference, [
      reference,
      item('fr-a', 'france', 1919, 2),
      item('fr-b', 'france', 1919, 3),
      item('ru', 'russia', 1920),
      item('cn', 'china', 1918),
    ], 3);

    expect(result[0].item.id).toBe('fr-b');
    expect(result[0].exactYear).toBe(true);
    expect(new Set(result.map((entry) => entry.item.country)).size).toBe(3);
    expect(result.every((entry) => entry.item.country !== 'germany')).toBe(true);
  });
});
