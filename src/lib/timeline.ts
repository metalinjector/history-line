import type {
  CountryId,
  Granularity,
  Importance,
  KindFilter,
  Period,
  TimelineColumn,
  TimelineGroup,
  TimelineItem,
} from '../types';
import { columnOfItem } from '../data/columns';
import { eraForYear } from '../data/eras';
import { periodContains } from '../data/periods';
import { formatYearLabel, MONTHS_NOMINATIVE, timeKey } from './format';

export type FilterState = {
  layer: KindFilter;
  countries: CountryId[];
  /** Поисковый запрос по заголовку, описанию и тегам. */
  query: string;
  /** Пустой массив — теги не фильтруют. */
  tags: string[];
  /** Показывать только опорные вехи (importance = 3). */
  keyOnly: boolean;
  /** Ограничение по отрезку времени — эпоха или интервал; undefined — вся шкала. */
  period?: Period;
  /** Включать даты до нашей эры в общую шкалу. */
  showBce: boolean;
};

export type BuildGroupOptions = {
  /**
   * Добавить пустые строки на границах исторических линий внутри видимого
   * интервала. Так линия может закончиться ровно в 476 или 1806 году, даже
   * если в этом году нет отдельной карточки текущей выборки.
   */
  lineBoundaryRange?: { from: number; to: number };
};

export const emptyFilter: FilterState = {
  layer: 'all',
  countries: [],
  query: '',
  tags: [],
  keyOnly: false,
  showBce: true,
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
  const period = filter.period;

  return items.filter((item) => {
    // Объект слоя живёт по правилам своего слоя, а не колонки страны.
    if (!item.layerId && !countrySet.has(item.country)) return false;
    if (filter.layer === 'events' && item.kind !== 'event') return false;
    if (filter.layer === 'people' && item.kind !== 'person') return false;
    if (!filter.showBce && item.year < 0) return false;
    if (filter.keyOnly && (item.importance ?? 2) < 3) return false;
    if (period && !periodContains(period, item.year, item.endYear)) return false;
    if (tagSet.size > 0 && !item.tags.some((tag) => tagSet.has(tag))) return false;
    if (filter.query && !matchesQuery(item, filter.query)) return false;
    return true;
  });
}

/**
 * Пороги масштаба, на которых шкала переходит к более дробному времени.
 * Ниже 120% колонки перестают расширяться, и дальнейшее приближение
 * тратится не на ширину, а на точность времени.
 */
export const GRANULARITY_STEPS: { from: number; granularity: Granularity; label: string }[] = [
  { from: 0, granularity: 'year', label: 'годы' },
  { from: 1.2, granularity: 'month', label: 'месяцы' },
  { from: 1.55, granularity: 'day', label: 'дни' },
];

/** Уровень детализации, соответствующий текущему масштабу. */
export function granularityForZoom(zoom: number): Granularity {
  let result: Granularity = 'year';
  for (const step of GRANULARITY_STEPS) if (zoom >= step.from) result = step.granularity;
  return result;
}

export function granularityLabel(granularity: Granularity): string {
  return GRANULARITY_STEPS.find((step) => step.granularity === granularity)?.label ?? 'годы';
}

/**
 * Ключ группы для выбранного уровня детализации.
 *
 * Детализация «интеллектуальная»: объект дробится настолько, насколько
 * точно известна его дата. Событие, у которого записан только год, остаётся
 * в годовой строке даже в режиме месяцев — вместо того чтобы попасть
 * в выдуманный январь.
 */
export function groupKeyOf(item: TimelineItem, granularity: Granularity): string {
  const year = item.year < 0 ? `b${Math.abs(item.year)}` : String(item.year);
  if (item.approximate) return year;
  if (granularity === 'day' && item.month && item.day) {
    return `${year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
  }
  if (granularity !== 'year' && item.month) {
    return `${year}-${String(item.month).padStart(2, '0')}`;
  }
  return year;
}

/** Разбирает ключ группы, не путая знак года с разделителем месяца. */
export function groupParts(key: string): [number, number?, number?] {
  const [rawYear = '0', rawMonth, rawDay] = key.split('-');
  const year = rawYear.startsWith('b') ? -Number(rawYear.slice(1)) : Number(rawYear);
  return [year, rawMonth === undefined ? undefined : Number(rawMonth), rawDay === undefined ? undefined : Number(rawDay)];
}

function groupLabel(year: number, month?: number, day?: number): { label: string; sublabel?: string } {
  if (day && month) {
    return { label: `${day} ${MONTHS_NOMINATIVE[month - 1].slice(0, 3)}`, sublabel: formatYearLabel(year) };
  }
  if (month) return { label: MONTHS_NOMINATIVE[month - 1], sublabel: formatYearLabel(year) };
  return { label: formatYearLabel(year) };
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
  columns: TimelineColumn[],
  granularity: Granularity = 'year',
  options: BuildGroupOptions = {},
): TimelineGroup[] {
  // Порядок дорожек внутри колонки — для устойчивой сортировки в ячейке.
  const trackOrder = new Map<string, number>();
  for (const column of columns) {
    column.tracks.forEach((track, index) => trackOrder.set(track.id, index));
  }
  const orderOf = (item: TimelineItem) =>
    trackOrder.get(item.layerId ? `layer:${item.layerId}` : `country:${item.country}`) ?? 0;

  const buckets = new Map<string, TimelineItem[]>();

  for (const item of items) {
    const key = groupKeyOf(item, granularity);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  // Пустая выдача должна оставаться пустой: границы линий не являются
  // результатами поиска и не должны превращать «ничего не найдено» в сетку.
  if (items.length > 0 && options.lineBoundaryRange) {
    const { from, to } = options.lineBoundaryRange;
    for (const column of columns) {
      for (const track of column.tracks) {
        if (!track.lineSpan) continue;
        for (const year of [track.lineSpan.from, track.lineSpan.to]) {
          if (year < from || year > to) continue;
          const key = year < 0 ? `b${Math.abs(year)}` : String(year);
          if (!buckets.has(key)) buckets.set(key, []);
        }
      }
    }
  }

  const groups: TimelineGroup[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
    const [ay = 0, am = 0, ad = 0] = groupParts(a);
    const [by = 0, bm = 0, bd = 0] = groupParts(b);
    return ay - by || (am ?? 0) - (bm ?? 0) || (ad ?? 0) - (bd ?? 0);
  });

  let previousEra: string | undefined;

  for (const key of sortedKeys) {
    const bucket = buckets.get(key)!;
    bucket.sort(
      (a, b) =>
        timeKey(a) - timeKey(b) ||
        orderOf(a) - orderOf(b) ||
        (b.importance ?? 2) - (a.importance ?? 2) ||
        a.title.localeCompare(b.title, 'ru'),
    );

    const [year, month, day] = groupParts(key);
    const era = eraForYear(year);
    const { label, sublabel } = groupLabel(
      year,
      month,
      day,
    );
    const byColumn: Record<string, TimelineItem[]> = {};
    for (const column of columns) byColumn[column.id] = [];
    for (const item of bucket) {
      const column = columnOfItem(item, columns);
      if (column) byColumn[column.id]?.push(item);
    }

    const weight = bucket.reduce<Importance>(
      (max, item) => (Math.max(max, item.importance ?? 2) as Importance),
      1,
    );

    groups.push({
      key,
      year,
      month,
      day,
      label,
      sublabel,
      era,
      startsEra: era.id !== previousEra,
      items: bucket,
      byColumn,
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
