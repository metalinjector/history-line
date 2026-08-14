import { describe, expect, it } from 'vitest';
import type { HistoricalLineSpan, TimelineColumn, TimelineItem } from '../types';
import { buildGroups } from './timeline';
import { railSegmentForYear } from './timelineRail';

const lineSpan: HistoricalLineSpan = {
  from: 962,
  to: 1806,
  sources: [{ label: 'DHM', url: 'https://example.com', kind: 'institution' }],
};

function columnsFor(span: HistoricalLineSpan): TimelineColumn[] {
  return [
    {
      id: 'historical-line',
      label: 'Историческая линия',
      short: 'ИСТ',
      tracks: [
        {
          id: 'country:historical-line',
          label: 'Историческая линия',
          short: 'ИСТ',
          color: '20 70% 50%',
          colorInk: '20 60% 35%',
          kind: 'country',
          countryId: 'holy-roman-empire',
          lineSpan: span,
        },
      ],
      shared: false,
    },
  ];
}

describe('bounded historical rails', () => {
  it('keeps modern territorial lines continuous', () => {
    expect(railSegmentForYear(undefined, -753)).toBe('full');
    expect(railSegmentForYear(undefined, 2026)).toBe('full');
  });

  it('does not render a named historical line outside its lifespan', () => {
    expect(railSegmentForYear(lineSpan, 961)).toBeUndefined();
    expect(railSegmentForYear(lineSpan, 1807)).toBeUndefined();
  });

  it('caps the first and last visible rows of the lifespan', () => {
    expect(railSegmentForYear(lineSpan, 962, 900, 1000)).toBe('start');
    expect(railSegmentForYear(lineSpan, 1000, 962, 1806)).toBe('full');
    expect(railSegmentForYear(lineSpan, 1806, 1000, 1815)).toBe('end');
  });

  it('waits for the last month or day before ending a line', () => {
    expect(railSegmentForYear(lineSpan, 962, 900, 962)).toBe('start');
    expect(railSegmentForYear(lineSpan, 962, 962, 1000)).toBe('full');
    expect(railSegmentForYear(lineSpan, 1806, 1800, 1806)).toBe('full');
    expect(railSegmentForYear(lineSpan, 1806, 1806, 1815)).toBe('end');
  });

  it('renders a one-year historical line as a single capped segment', () => {
    expect(
      railSegmentForYear({ ...lineSpan, from: 1204, to: 1204 }, 1204, 1203, 1205),
    ).toBe('single');
  });

  it('adds exact boundary rows even when those years have no cards', () => {
    const columns = columnsFor(lineSpan);
    const item: TimelineItem = {
      id: 'inside-line',
      country: 'holy-roman-empire',
      year: 1000,
      kind: 'event',
      title: 'Событие',
      summary: 'Событие внутри линии.',
      detail: 'Подробное описание события внутри исторической линии.',
      tags: [],
    };

    const groups = buildGroups([item], columns, 'year', {
      lineBoundaryRange: { from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
    });

    expect(groups.map((group) => group.year)).toEqual([962, 1000, 1806]);
    expect(groups[0].items).toEqual([]);
    expect(groups[2].items).toEqual([]);
  });

  it('uses a BCE group key and respects the visible boundary range', () => {
    const ancientSpan: HistoricalLineSpan = {
      ...lineSpan,
      from: -753,
      to: 476,
      approximate: true,
    };
    const item: TimelineItem = {
      id: 'roman-item',
      country: 'holy-roman-empire',
      year: 1,
      kind: 'event',
      title: 'Событие',
      summary: 'Событие внутри линии.',
      detail: 'Подробное описание события внутри исторической линии.',
      tags: [],
    };

    const allGroups = buildGroups([item], columnsFor(ancientSpan), 'year', {
      lineBoundaryRange: { from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
    });
    expect(allGroups.map((group) => group.key)).toEqual(['b753', '1', '476']);

    const ceOnlyGroups = buildGroups([item], columnsFor(ancientSpan), 'year', {
      lineBoundaryRange: { from: 1, to: Number.POSITIVE_INFINITY },
    });
    expect(ceOnlyGroups.map((group) => group.key)).toEqual(['1', '476']);
    expect(buildGroups([], columnsFor(ancientSpan), 'year', {
      lineBoundaryRange: { from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY },
    })).toEqual([]);
  });
});
