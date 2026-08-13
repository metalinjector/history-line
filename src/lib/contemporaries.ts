import type { CountryId, TimelineItem } from '../types';
import { timeKey } from './format';

export type Contemporary = {
  item: TimelineItem;
  distanceYears: number;
  exactYear: boolean;
};

/**
 * Находит ближайший контекст в других странах без ручного поля parallel.
 * Сначала даёт географическую широту (не более одного объекта на страну),
 * затем при наличии места добавляет следующие ближайшие события.
 */
export function findContemporaries(
  reference: TimelineItem,
  items: TimelineItem[],
  limit = 6,
  maxDistanceYears = 50,
): Contemporary[] {
  const candidates = items
    .filter(
      (item) =>
        item.id !== reference.id &&
        item.country !== reference.country &&
        Math.abs(item.year - reference.year) <= maxDistanceYears,
    )
    .map((item) => ({
      item,
      distanceYears: Math.abs(item.year - reference.year),
      exactYear: item.year === reference.year,
      distance: Math.abs(timeKey(item) - timeKey(reference)),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        (b.item.importance ?? 2) - (a.item.importance ?? 2) ||
        a.item.title.localeCompare(b.item.title, 'ru'),
    );

  const selected: typeof candidates = [];
  const countries = new Set<CountryId>();
  for (const candidate of candidates) {
    if (countries.has(candidate.item.country)) continue;
    selected.push(candidate);
    countries.add(candidate.item.country);
    if (selected.length === limit) break;
  }
  for (const candidate of candidates) {
    if (selected.length === limit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.map(({ item, distanceYears, exactYear }) => ({ item, distanceYears, exactYear }));
}
