import type {
  CountryId,
  Layer,
  LayerPlacement,
  TimelineColumn,
  TimelineItem,
  Track,
} from '../types';
import { OWN_COLUMN } from '../types';
import { countryById } from '../data/countries';
import { layerById } from '../data/layers';
import { MAX_PER_COLUMN } from '../data/columns';

/** Куда положен каждый включённый слой. */
export type LayerPlacements = Record<string, LayerPlacement>;

export type LayerState = {
  /** Слой, у которого есть куда лечь: страна видна либо у слоя своя колонка. */
  placed: Layer[];
  /** Слой включён, но его страна скрыта — показываем предупреждение. */
  homeless: Layer[];
  /** Почему включённый слой пока нельзя показать. */
  unplacedReasons: Record<string, 'hidden-host' | 'full-host'>;
};

/** Дорожка для страны. */
export function countryTrack(id: CountryId): Track {
  const country = countryById[id];
  return {
    id: `country:${country.id}`,
    label: country.label,
    short: country.short,
    color: country.color,
    colorInk: country.colorInk,
    kind: 'country',
    countryId: country.id,
  };
}

/** Дорожка для слоя. */
export function layerTrack(layer: Layer): Track {
  return {
    id: `layer:${layer.id}`,
    label: layer.title,
    short: layer.short,
    color: layer.color,
    colorInk: layer.colorInk,
    kind: 'layer',
    layerId: layer.id,
  };
}

/**
 * Раскладывает включённые слои по колонкам.
 *
 * Слой либо ложится дорожкой поверх колонки страны, либо получает собственную
 * колонку. Если страна размещения скрыта, слой не выбрасывается молча:
 * он попадает в homeless, и панель предлагает перенести его.
 *
 * Число слоёв нигде не зашито: функция обрабатывает любой их набор,
 * а ограничение в интерфейсе — отдельная константа MAX_ACTIVE_LAYERS.
 */
export function applyLayers(
  columns: TimelineColumn[],
  activeLayerIds: string[],
  placements: LayerPlacements,
): { columns: TimelineColumn[]; state: LayerState } {
  const placed: Layer[] = [];
  const homeless: Layer[] = [];
  const unplacedReasons: LayerState['unplacedReasons'] = {};

  // Копии колонок: дорожки будем дополнять, не трогая исходные объекты.
  const next = columns.map((column) => ({ ...column, tracks: [...column.tracks] }));
  const ownColumns: TimelineColumn[] = [];

  for (const layerId of activeLayerIds) {
    const layer = layerById[layerId];
    if (!layer) continue;

    const placement = placements[layerId] ?? layer.defaultPlacement;

    if (placement === OWN_COLUMN) {
      const track = layerTrack(layer);
      ownColumns.push({
        id: `layer:${layer.id}`,
        tracks: [track],
        label: layer.title,
        short: layer.short,
        shared: false,
        layerOnly: true,
      });
      placed.push(layer);
      continue;
    }

    const host = next.find((column) =>
      column.tracks.some((track) => track.countryId === placement),
    );

    if (!host) {
      homeless.push(layer);
      unplacedReasons[layer.id] = 'hidden-host';
      continue;
    }

    // Ограничение относится ко всем дорожкам, а не только к объединённым странам.
    // Иначе три страны + три слоя превращали колонку в нечитаемые шесть линий.
    if (host.tracks.length >= MAX_PER_COLUMN) {
      homeless.push(layer);
      unplacedReasons[layer.id] = 'full-host';
      continue;
    }

    host.tracks.push(layerTrack(layer));
    host.shared = host.tracks.length > 1;
    placed.push(layer);
  }

  return { columns: [...next, ...ownColumns], state: { placed, homeless, unplacedReasons } };
}

/**
 * Превращает объекты слоя в обычные объекты хронологии.
 *
 * Страну объект получает от размещения слоя: перетащили слой на другую
 * страну — и все его карточки переехали вместе с ним. Для слоя в своей
 * колонке страна формальна и на раскладку не влияет: объект находит колонку
 * по layerId, а фильтр по странам его не касается.
 */
export function materializeLayerItems(
  activeLayerIds: string[],
  placements: LayerPlacements,
  fallbackCountry: CountryId,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const layerId of activeLayerIds) {
    const layer = layerById[layerId];
    if (!layer) continue;

    const placement = placements[layerId] ?? layer.defaultPlacement;
    const country = placement === OWN_COLUMN ? fallbackCountry : placement;

    for (const item of layer.items) {
      items.push({ ...item, country, layerId: layer.id });
    }
  }

  return items;
}

/** Дорожка, на которой стоит объект: своя для слоя, страна для остальных. */
export function trackOfItem(item: TimelineItem, column: TimelineColumn): number {
  if (item.layerId) {
    const index = column.tracks.findIndex((track) => track.layerId === item.layerId);
    if (index >= 0) return index;
  }
  const index = column.tracks.findIndex((track) => track.countryId === item.country);
  return index >= 0 ? index : 0;
}
