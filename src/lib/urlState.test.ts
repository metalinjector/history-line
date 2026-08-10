import { describe, expect, it } from 'vitest';
import { buildTimelineUrl, parseTimelineUrl } from './urlState';

describe('timeline URL state', () => {
  it('round-trips filters, layers, focus and story progress', () => {
    const url = buildTimelineUrl({
      countries: ['france', 'russia'],
      kind: 'events',
      query: 'революция 1917',
      keyOnly: true,
      era: 'world-wars',
      tags: ['война', 'политика'],
      zoom: 1.55,
      activeLayerIds: ['einstein'],
      layerPlacements: { einstein: 'own' },
      columnGroups: [['france', 'russia']],
      selectedId: 'ru-1917',
      openedId: 'ru-1917',
      openedDayKey: '1917',
      openedRelationId: 'rel-1917',
      showRelations: false,
      storyId: 'revolution-1917-1922',
      storyStep: 2,
    }, 'https://example.test/history?utm=test#timeline');

    const parsed = parseTimelineUrl(new URL(url).search);
    expect(parsed).toMatchObject({
      countries: ['france', 'russia'], kind: 'events', query: 'революция 1917', keyOnly: true,
      era: 'world-wars', tags: ['война', 'политика'], zoom: 1.55,
      activeLayerIds: ['einstein'], layerPlacements: { einstein: 'own' },
      columnGroups: [['france', 'russia']],
      selectedId: 'ru-1917', openedId: 'ru-1917', openedDayKey: '1917',
      openedRelationId: 'rel-1917', showRelations: false,
      storyId: 'revolution-1917-1922', storyStep: 2,
    });
    expect(new URL(url).searchParams.get('utm')).toBe('test');
    expect(new URL(url).hash).toBe('#timeline');
  });

  it('drops invalid enum values and clamps zoom', () => {
    expect(parseTimelineUrl('?c=france,moon&kind=bad&era=nope&z=99&layers=unknown')).toEqual({
      countries: ['france'], kind: undefined, query: undefined, keyOnly: undefined,
      era: undefined, tags: [], zoom: 1.9, activeLayerIds: undefined,
      layerPlacements: undefined, columnGroups: undefined, selectedId: undefined, openedId: undefined,
      openedDayKey: undefined, openedRelationId: undefined, showRelations: undefined,
      storyId: undefined, storyStep: undefined,
    });
  });

  it('uses the session marker to override local defaults explicitly', () => {
    const url = buildTimelineUrl({
      countries: ['germany', 'england', 'france', 'russia', 'belarus', 'spain', 'china', 'japan'],
      kind: 'all', zoom: 1, activeLayerIds: [], layerPlacements: {}, columnGroups: [],
      showRelations: true,
    }, 'https://example.test/history');
    const parsed = parseTimelineUrl(new URL(url).search);

    expect(new URL(url).searchParams.get('view')).toBe('1');
    expect(parsed.countries).toHaveLength(8);
    expect(parsed.kind).toBe('all');
    expect(parsed.zoom).toBe(1);
    expect(parsed.activeLayerIds).toEqual([]);
    expect(parsed.layerPlacements).toEqual({});
    expect(parsed.columnGroups).toEqual([]);
    expect(parsed.showRelations).toBe(true);
  });
});
