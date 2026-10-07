import { describe, expect, it } from 'vitest';
import { buildColumns } from '../data/columns';
import type { TimelineItem } from '../types';
import { periodSegments } from './periods';
import { buildGroups } from './timeline';

const item = (id: string, year: number, endYear?: number, country: TimelineItem['country'] = 'france'): TimelineItem => ({
  id,
  country,
  year,
  endYear,
  kind: 'event',
  title: id,
  summary: id,
  detail: id,
  tags: [],
});

describe('periodSegments', () => {
  const columns = buildColumns(['france', 'england'], []);

  it('covers every group from the item to the last group not after endYear', () => {
    const items = [item('war', 1337, 1453), item('a', 1346), item('b', 1415), item('c', 1453), item('d', 1500)];
    const groups = buildGroups(items, columns);
    const segments = periodSegments(groups, columns);
    const years = groups.flatMap((group, index) => (segments.get(index)?.length ? [group.year] : []));

    expect(years).toEqual([1337, 1346, 1415, 1453]);
    expect(segments.get(0)?.[0]).toMatchObject({ starts: true, ends: false, slot: 0 });
    expect(segments.get(3)?.[0]).toMatchObject({ starts: false, ends: true });
  });

  it('runs to the edge of the last group when the end year has no mark of its own', () => {
    const items = [item('war', 1337, 1453), item('a', 1400), item('d', 1500)];
    const groups = buildGroups(items, columns);
    const segments = periodSegments(groups, columns);

    expect(segments.get(1)?.[0]).toMatchObject({ starts: false, ends: false });
    expect(segments.get(2)).toBeUndefined();
  });

  it('puts overlapping periods of one line into separate rows', () => {
    const items = [item('long', 1600, 1700), item('short', 1650, 1660), item('later', 1680, 1690), item('x', 1665)];
    const groups = buildGroups(items, columns);
    const segments = periodSegments(groups, columns);
    const slotOf = (id: string) => [...segments.values()].flat().find((segment) => segment.item.id === id)?.slot;

    expect(slotOf('long')).toBe(0);
    expect(slotOf('short')).toBe(1);
    // «short» закончился до начала «later» — ряд освободился.
    expect(slotOf('later')).toBe(1);
  });

  it('keeps periods of different lines apart and ignores points in time', () => {
    const items = [item('fr', 1337, 1453), item('gb', 1337, 1453, 'england'), item('point', 1400, 1400)];
    const groups = buildGroups(items, columns);
    const segments = periodSegments(groups, columns);
    const first = segments.get(0) ?? [];

    expect(first.map((segment) => [segment.item.id, segment.columnId, segment.slot]).sort()).toEqual([
      ['fr', 'france', 0],
      ['gb', 'england', 0],
    ]);
    expect([...segments.values()].flat().some((segment) => segment.item.id === 'point')).toBe(false);
  });
});
