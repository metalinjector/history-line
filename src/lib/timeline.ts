import type {
  CountryId,
  EraId,
  Granularity,
  Importance,
  Layer,
  TimelineGroup,
  TimelineItem,
} from '../types';
import { eraForYear } from '../data/eras';
import { MONTHS_NOMINATIVE, timeKey } from './format';

export type FilterState = {
  layer: Layer;
  countries: CountryId[];
  /** Поисковый запрос по заголовку, описанию и тегам. */
  query: string;
  /** Пустой массив — теги не фильтруют. */
  tags: string[];
  /** Показывать только опорные вехи (importance = 3). */
  keyOnly: boolean;
  /** Ограничение по эпохе; undefined — все эпохи. */
  era?: EraId;
};

export const emptyFilter: FilterState = {
  layer: 'all',
  countries: [],
  query: '',
  tags: [],
  keyOnly: false,
};

function normalize(value: string): string {
  return value.toLowerCase().replaceAll('ё', 'е');
}

/** Совпадает ли объект с поисковым запросом. Запрос разбивается на слова, нужны все. */
export function matchesQuery(item: TimelineItem, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [item.title, item.summary, item.detail, item.life ?? '', item.tags.join(' '), String(item.year)].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}

/**
 * Фильтрация объектов. Порядок проверок — от самой дешёвой к самой дорогой,
 * чтобы поиск по тексту выполнялся для минимального числа объектов.
 */
export function filterItems(items: TimelineItem[], filter: FilterState): TimelineItem[] {
  const countrySet = new Set(filter.countries);
  const tagSet = new Set(filter.tags);
  const era = filter.era;

  return items.filter((item) => {
    if (!countrySet.has(item.country)) return false;
    if (filter.layer === 'events' && item.kind !== 'event') return false;
    if (filter.layer === 'people' && item.kind !== 'person') return false;
    if (filter.keyOnly && (item.importance ?? 2) < 3) return false;
    if (era) {
      const itemEra = eraForYear(item.year);
      if (itemEra.id !== era) return false;
    }
    if (tagSet.size > 0 && !item.tags.some((tag) => tagSet.has(tag))) return false;
    if (filter.query && !matchesQuery(item, filter.query)) return false;
    return true;
  });
}

/** Ключ группы для выбранного уровня детализации. */
export function groupKeyOf(item: TimelineItem, granularity: Granularity): string {
  if (granularity === 'day' && item.month && item.day) {
    return `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
  }
  if (granularity !== 'year' && item.month) {
    return `${item.year}-${String(item.month).padStart(2, '0')}`;
  }
  return String(item.year);
}

function groupLabel(year: number, month?: number, day?: number): string {
  if (day && month) return `${day} ${MONTHS_NOMINATIVE[month - 1]}`;
  if (month) return `${MONTHS_NOMINATIVE[month - 1]} ${year}`;
  return String(year);
}

/**
 * Собирает строки хронологии.
 *
 * Уровень детализации вынесен в параметр: сейчас интерфейс работает с 'year',
 * но переключение на 'month' или 'day' не требует других изменений —
 * строки просто станут дробнее там, где в данных есть месяц и день.
 */
export function buildGroups(
  items: TimelineItem[],
  countries: CountryId[],
  granularity: Granularity = 'year',
): TimelineGroup[] {
  const buckets = new Map<string, TimelineItem[]>();

  for (const item of items) {
    const key = groupKeyOf(item, granularity);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const groups: TimelineGroup[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
    const [ay = 0, am = 0, ad = 0] = a.split('-').map(Number);
    const [by = 0, bm = 0, bd = 0] = b.split('-').map(Number);
    return ay - by || am - bm || ad - bd;
  });

  let previousEra: string | undefined;

  for (const key of sortedKeys) {
    const bucket = buckets.get(key)!;
    bucket.sort(
      (a, b) =>
        timeKey(a) - timeKey(b) ||
        (b.importance ?? 2) - (a.importance ?? 2) ||
        a.title.localeCompare(b.title, 'ru'),
    );

    const [year, month, day] = key.split('-').map(Number);
    const era = eraForYear(year);
    const byCountry: Record<string, TimelineItem[]> = {};
    for (const country of countries) byCountry[country] = [];
    for (const item of bucket) byCountry[item.country]?.push(item);

    const weight = bucket.reduce<Importance>(
      (max, item) => (Math.max(max, item.importance ?? 2) as Importance),
      1,
    );

    groups.push({
      key,
      year,
      month: Number.isNaN(month) ? undefined : month,
      day: Number.isNaN(day) ? undefined : day,
      label: groupLabel(year, Number.isNaN(month) ? undefined : month, Number.isNaN(day) ? undefined : day),
      era,
      startsEra: era.id !== previousEra,
      items: bucket,
      byCountry,
      weight,
    });

    previousEra = era.id;
  }

  return groups;
}

/**
 * Ищет ближайший доступный объект, когда выбранный исчез из-за фильтра
 * или скрытия страны. Сравнение идёт по позиции на шкале.
 */
export function findNearestItem(
  items: TimelineItem[],
  reference: TimelineItem | undefined,
): TimelineItem | undefined {
  if (items.length === 0) return undefined;
  if (!reference) return items[0];

  const target = timeKey(reference);
  let best = items[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const item of items) {
    const distance = Math.abs(timeKey(item) - target);
    // При равном расстоянии предпочитаем ту же страну, затем более важное событие.
    const sameCountryBonus = item.country === reference.country ? -1 : 0;
    const score = distance + sameCountryBonus;
    if (score < bestDistance) {
      best = item;
      bestDistance = score;
    }
  }

  return best;
}

/** Сводная статистика для панели управления. */
export function summarize(items: TimelineItem[]) {
  let events = 0;
  let people = 0;
  let key = 0;
  let minYear = Number.POSITIVE_INFINITY;
  let maxYear = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    if (item.kind === 'event') events += 1;
    else people += 1;
    if ((item.importance ?? 2) >= 3) key += 1;
    if (item.year < minYear) minYear = item.year;
    if (item.year > maxYear) maxYear = item.year;
  }

  return {
    total: items.length,
    events,
    people,
    key,
    minYear: Number.isFinite(minYear) ? minYear : 1,
    maxYear: Number.isFinite(maxYear) ? maxYear : 1,
  };
}
