import type { Country, CountryId, TimelineColumn } from '../types';
import { allCountryIds, countryById } from './countries';

/**
 * Сколько колонок помещается в поле без горизонтальной прокрутки.
 * Это ориентир, а не запрет: колонок может быть и больше, просто часть
 * уедет за край. Значение используется только для подсказки пользователю.
 */
export const MAX_COLUMNS = 6;

/** Больше трёх линий в одной колонке уже не читается: узлы сливаются. */
export const MAX_PER_COLUMN = 3;

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

function makeColumn(countries: Country[]): TimelineColumn {
  return {
    id: countries.map((country) => country.id).join('+'),
    countries,
    label: countries.map((country) => country.label).join(' · '),
    short: countries.map((country) => country.short).join(' · '),
    shared: countries.length > 1,
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

  const used = new Set<CountryId>();
  const columns: TimelineColumn[] = [];

  for (const id of active) {
    if (used.has(id)) continue;
    const members = groupOf.get(id) ?? [id];
    for (const member of members) used.add(member);
    columns.push(makeColumn(members.map((member) => countryById[member])));
  }

  return columns;
}

/** Сопоставление «страна → колонка», нужное при раскладке объектов по ячейкам. */
export function columnIndex(columns: TimelineColumn[]): Record<string, TimelineColumn> {
  const index: Record<string, TimelineColumn> = {};
  for (const column of columns) {
    for (const country of column.countries) index[country.id] = column;
  }
  return index;
}
