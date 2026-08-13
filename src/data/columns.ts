import type { CountryId, TimelineColumn, TimelineItem, Track } from '../types';
import { allCountryIds, countryById } from './countries';

/**
 * Сколько колонок помещается в поле без горизонтальной прокрутки.
 * Это ориентир, а не запрет: колонок может быть и больше, просто часть
 * уедет за край. Значение используется только для подсказки пользователю.
 */
export const MAX_COLUMNS = 6;

/** Больше трёх вручную объединённых стран в одной колонке уже не читается. */
export const MAX_PER_COLUMN = 3;

/**
 * Какие линии-предшественники достаются выбранным линиям.
 *
 * Предшественник подселяется в колонку наследника **только если сам не выбран**
 * отдельной колонкой: если читатель включил и Италию, и Древний Рим, у Рима
 * своя колонка, и дублировать его в итальянской нельзя.
 *
 * Возвращает соответствие «предшественник → наследник», по которому потом
 * строятся дорожки и расширяется фильтр по странам.
 */
export function impliedAncestors(activeIds: CountryId[]): Map<CountryId, CountryId> {
  const active = new Set(activeIds);
  const result = new Map<CountryId, CountryId>();

  for (const id of activeIds) {
    for (const ancestor of countryById[id]?.ancestors ?? []) {
      if (active.has(ancestor) || result.has(ancestor)) continue;
      if (!countryById[ancestor]) continue;
      result.set(ancestor, id);
    }
  }

  return result;
}

/** Выбранные линии плюс те, что достались им по наследству, — для фильтра. */
export function effectiveCountryIds(activeIds: CountryId[]): CountryId[] {
  return [...activeIds, ...impliedAncestors(activeIds).keys()];
}

/**
 * Объединения колонок, заданные пользователем.
 * Каждая группа — список стран, которые делят одну дорожку.
 * По умолчанию пусто: у каждой страны своя колонка.
 */
export type ColumnGroups = CountryId[][];

/** Убирает несуществующие страны, повторы и группы, в которых осталась одна линия. */
export function normalizeGroups(groups: ColumnGroups): ColumnGroups {
  const seen = new Set<CountryId>();
  const result: ColumnGroups = [];

  for (const group of groups) {
    const members = group.filter(
      (id) => allCountryIds.includes(id) && !seen.has(id) && countryById[id],
    );
    for (const id of members) seen.add(id);
    if (members.length > 1) result.push(members.slice(0, MAX_PER_COLUMN));
  }

  return result;
}

/** Добавляет страну source в колонку страны target. */
export function mergeCountries(
  groups: ColumnGroups,
  target: CountryId,
  source: CountryId,
): ColumnGroups {
  if (target === source) return groups;

  // Страна может быть только в одной колонке, поэтому сначала вынимаем её отовсюду.
  const without = groups.map((group) => group.filter((id) => id !== source));
  const targetIndex = without.findIndex((group) => group.includes(target));

  if (targetIndex === -1) return normalizeGroups([...without, [target, source]]);
  if (without[targetIndex].length >= MAX_PER_COLUMN) return normalizeGroups(without);

  const next = without.map((group, index) => (index === targetIndex ? [...group, source] : group));
  return normalizeGroups(next);
}

/** Возвращает страну в собственную колонку. */
export function detachCountry(groups: ColumnGroups, id: CountryId): ColumnGroups {
  return normalizeGroups(groups.map((group) => group.filter((member) => member !== id)));
}

function trackOf(id: CountryId, inherited = false): Track {
  const country = countryById[id];
  return {
    id: `country:${country.id}`,
    label: country.label,
    short: country.short,
    color: country.color,
    colorInk: country.colorInk,
    kind: 'country' as const,
    countryId: country.id,
    ...(inherited ? { inherited: true } : {}),
  };
}

function makeColumn(countryIds: CountryId[], inherited: CountryId[] = []): TimelineColumn {
  // Дорожка предшественника идёт после своей страны: сначала «Италия», потом «Древний Рим».
  const tracks: Track[] = [
    ...countryIds.map((id) => trackOf(id)),
    ...inherited.map((id) => trackOf(id, true)),
  ];

  return {
    id: countryIds.join('+'),
    tracks,
    label: tracks.map((track) => track.label).join(' · '),
    short: tracks.map((track) => track.short).join(' · '),
    shared: tracks.length > 1,
  };
}

/**
 * Раскладывает включённые страны по колонкам.
 *
 * По умолчанию каждая страна получает свою колонку. Колонка становится общей
 * только там, где пользователь сам объединил линии. Позиция колонки — позиция
 * её первой включённой страны в каноническом порядке, поэтому колонки
 * не прыгают при включении и выключении соседей.
 */
export function buildColumns(activeIds: CountryId[], groups: ColumnGroups): TimelineColumn[] {
  const active = allCountryIds.filter((id) => activeIds.includes(id));
  const activeSet = new Set(active);

  const groupOf = new Map<CountryId, CountryId[]>();
  for (const group of normalizeGroups(groups)) {
    const members = group.filter((id) => activeSet.has(id));
    if (members.length < 2) continue;
    for (const id of members) groupOf.set(id, members);
  }

  const inheritedBy = new Map<CountryId, CountryId[]>();
  for (const [ancestor, host] of impliedAncestors(active)) {
    inheritedBy.set(host, [...(inheritedBy.get(host) ?? []), ancestor]);
  }

  const used = new Set<CountryId>();
  const columns: TimelineColumn[] = [];

  for (const id of active) {
    if (used.has(id)) continue;
    const members = groupOf.get(id) ?? [id];
    for (const member of members) used.add(member);
    const inherited = members.flatMap((member) => inheritedBy.get(member) ?? []);
    columns.push(makeColumn(members, inherited));
  }

  return columns;
}

/**
 * Находит колонку объекта.
 *
 * Объект слоя ищет колонку по слою — так он остаётся в своей дорожке
 * независимо от того, какая страна ему формально присвоена.
 * Обычный объект ищет колонку по стране.
 */
export function columnOfItem(
  item: TimelineItem,
  columns: TimelineColumn[],
): TimelineColumn | undefined {
  if (item.layerId) {
    const byLayer = columns.find((column) =>
      column.tracks.some((track) => track.layerId === item.layerId),
    );
    if (byLayer) return byLayer;
  }
  return columns.find((column) =>
    column.tracks.some((track) => track.countryId === item.country),
  );
}
