import type { Country, CountryId, TimelineColumn } from '../types';
import { allCountryIds, countryById } from './countries';

/**
 * Больше шести колонок на экране не помещается без потери читаемости карточки:
 * при ширине поля около 1550 px на колонку остаётся ~250 px, и это уже нижняя
 * граница, при которой заголовок и краткое описание ещё нормально верстаются.
 */
export const MAX_COLUMNS = 6;

/**
 * Пары стран, которые «вклиниваются» в общую колонку, когда включено
 * больше шести линий. Порядок важен: пары объединяются сверху вниз,
 * пока число колонок не станет допустимым.
 *
 * Пары подобраны по историческому родству — у таких линий много общих
 * сюжетов, и их удобно читать рядом в одной колонке.
 */
export const columnPairs: [CountryId, CountryId][] = [
  ['russia', 'belarus'],
  ['china', 'japan'],
  ['germany', 'spain'],
  ['england', 'france'],
];

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
 * Пока стран не больше MAX_COLUMNS, каждая получает свою колонку.
 * Дальше подключаются пары: каждая объединённая пара убирает одну колонку.
 * Порядок колонок — канонический порядок стран по ведущей стране пары,
 * поэтому колонки не прыгают при включении и выключении соседей.
 */
export function buildColumns(activeIds: CountryId[]): TimelineColumn[] {
  const active = allCountryIds.filter((id) => activeIds.includes(id));
  const activeSet = new Set(active);

  let excess = active.length - MAX_COLUMNS;
  const partners = new Map<CountryId, CountryId>();
  const absorbed = new Set<CountryId>();

  for (const [leader, partner] of columnPairs) {
    if (excess <= 0) break;
    if (!activeSet.has(leader) || !activeSet.has(partner)) continue;
    if (partners.has(leader) || absorbed.has(leader) || absorbed.has(partner)) continue;

    partners.set(leader, partner);
    absorbed.add(partner);
    excess -= 1;
  }

  const columns: TimelineColumn[] = [];
  for (const id of active) {
    if (absorbed.has(id)) continue;
    const partner = partners.get(id);
    columns.push(
      makeColumn(partner ? [countryById[id], countryById[partner]] : [countryById[id]]),
    );
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
