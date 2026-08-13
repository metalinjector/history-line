import type { CountryId, KindFilter, LayerPlacement, Period } from '../types';
import { OWN_COLUMN } from '../types';
import { allCountryIds } from '../data/countries';
import { normalizeGroups, type ColumnGroups } from '../data/columns';
import { decodePeriod, encodePeriod } from '../data/periods';
import { layers, MAX_ACTIVE_LAYERS } from '../data/layers';
import { stories } from '../data/stories';
import { timelineItems } from '../data/timelineItems';
import { clampZoom } from './zoom';

export type TimelineUrlState = {
  countries?: CountryId[];
  kind?: KindFilter;
  query?: string;
  keyOnly?: boolean;
  period?: Period;
  showBce?: boolean;
  tags?: string[];
  zoom?: number;
  activeLayerIds?: string[];
  layerPlacements?: Record<string, LayerPlacement>;
  columnGroups?: ColumnGroups;
  selectedId?: string;
  openedId?: string;
  openedDayKey?: string;
  openedRelationId?: string;
  showRelations?: boolean;
  storyId?: string;
  storyStep?: number;
};

const validKinds = new Set<KindFilter>(['all', 'events', 'people']);
const validLayers = new Set(layers.map((layer) => layer.id));
const storiesById = new Map(stories.map((story) => [story.id, story]));
/** Верхняя граница шкалы: по ней проверяются интервалы из ссылки. */
const maxYear = timelineItems.reduce((max, item) => Math.max(max, item.endYear ?? item.year), 1);

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function parseTimelineUrl(search: string): TimelineUrlState {
  const params = new URLSearchParams(search);
  const shared = params.get('view') === '1';
  const countryIds = unique(
    (params.get('c') ?? '').split(',').filter((id): id is CountryId => allCountryIds.includes(id as CountryId)),
  );
  const kind = params.get('kind') as KindFilter | null;
  const rawZoom = Number(params.get('z'));
  const layerIds = unique((params.get('layers') ?? '').split(',').filter((id) => validLayers.has(id)))
    .slice(0, MAX_ACTIVE_LAYERS);
  const placements: Record<string, LayerPlacement> = {};
  const columnGroups = normalizeGroups(
    (params.get('groups') ?? '')
      .split(';')
      .map((group) => group.split('+').filter((id): id is CountryId => allCountryIds.includes(id as CountryId))),
  );

  for (const pair of (params.get('place') ?? '').split(';')) {
    const [layerId, placement] = pair.split(':');
    if (!validLayers.has(layerId)) continue;
    if (placement === OWN_COLUMN || allCountryIds.includes(placement as CountryId)) {
      placements[layerId] = placement as LayerPlacement;
    }
  }

  const rawStep = Number(params.get('step'));
  const storyId = params.get('story') || undefined;
  const story = storyId ? storiesById.get(storyId) : undefined;
  const storyStep =
    story && Number.isInteger(rawStep) && rawStep > 0
      ? Math.min(rawStep - 1, story.steps.length - 1)
      : undefined;
  return {
    countries: countryIds.length ? countryIds : shared ? allCountryIds : undefined,
    kind: kind && validKinds.has(kind) ? kind : shared ? 'all' : undefined,
    query: params.get('q') || undefined,
    keyOnly: params.get('key') === '1' || undefined,
    period: decodePeriod(params.get('period'), maxYear),
    showBce: params.get('bce') === '0' ? false : shared ? true : undefined,
    tags: unique(params.getAll('tag').map((tag) => tag.trim()).filter(Boolean)),
    zoom: Number.isFinite(rawZoom) && params.has('z') ? clampZoom(rawZoom) : shared ? 1 : undefined,
    activeLayerIds: layerIds.length ? layerIds : shared ? [] : undefined,
    layerPlacements: Object.keys(placements).length ? placements : shared ? {} : undefined,
    columnGroups: columnGroups.length ? columnGroups : shared ? [] : undefined,
    selectedId: params.get('focus') || undefined,
    openedId: params.get('item') || undefined,
    openedDayKey: params.get('day') || undefined,
    openedRelationId: params.get('relation') || undefined,
    showRelations: params.get('threads') === '0' ? false : shared ? true : undefined,
    storyId: story?.id,
    storyStep,
  };
}

/** Строит каноническую ссылку, опуская значения по умолчанию. */
export function buildTimelineUrl(state: TimelineUrlState, href: string): string {
  const url = new URL(href);
  const params = url.searchParams;
  ['view', 'c', 'kind', 'q', 'key', 'bce', 'period', 'tag', 'z', 'layers', 'place', 'groups', 'focus', 'item', 'day', 'relation', 'threads', 'story', 'step'].forEach((key) =>
    params.delete(key),
  );
  params.set('view', '1');

  const countries = state.countries ?? allCountryIds;
  if (countries.length !== allCountryIds.length || countries.some((id, index) => id !== allCountryIds[index])) {
    params.set('c', countries.join(','));
  }
  if (state.kind && state.kind !== 'all') params.set('kind', state.kind);
  if (state.query) params.set('q', state.query);
  if (state.keyOnly) params.set('key', '1');
  if (state.showBce === false) params.set('bce', '0');
  if (state.period) params.set('period', encodePeriod(state.period));
  for (const tag of state.tags ?? []) params.append('tag', tag);
  if (state.zoom !== undefined && Math.abs(state.zoom - 1) > 0.001) params.set('z', String(state.zoom));
  if (state.activeLayerIds?.length) params.set('layers', state.activeLayerIds.join(','));

  const placements = Object.entries(state.layerPlacements ?? {})
    .filter(([layerId]) => state.activeLayerIds?.includes(layerId))
    .map(([layerId, placement]) => `${layerId}:${placement}`);
  if (placements.length) params.set('place', placements.join(';'));
  if (state.columnGroups?.length) {
    params.set('groups', state.columnGroups.map((group) => group.join('+')).join(';'));
  }
  if (state.selectedId) params.set('focus', state.selectedId);
  if (state.openedId) params.set('item', state.openedId);
  if (state.openedDayKey) params.set('day', state.openedDayKey);
  if (state.openedRelationId) params.set('relation', state.openedRelationId);
  if (state.showRelations === false) params.set('threads', '0');
  if (state.storyId) {
    params.set('story', state.storyId);
    params.set('step', String((state.storyStep ?? 0) + 1));
  }

  return url.toString();
}
