import type { CountryId, Era, EraId, TimelineItem } from '../types';
import { hasVerifiedSources } from './provenance';

export type EditorialCell = {
  total: number;
  sourced: number;
  articles: number;
  exactDates: number;
  milestones: number;
};

export type EditorialMatrix = Record<CountryId, Record<EraId, EditorialCell>>;

const emptyCell = (): EditorialCell => ({ total: 0, sourced: 0, articles: 0, exactDates: 0, milestones: 0 });

export function buildEditorialMatrix(
  items: TimelineItem[],
  countryIds: CountryId[],
  eras: Era[],
): EditorialMatrix {
  const matrix = Object.fromEntries(
    countryIds.map((country) => [
      country,
      Object.fromEntries(eras.map((era) => [era.id, emptyCell()])),
    ]),
  ) as EditorialMatrix;

  for (const item of items.filter((value) => !value.layerId && !value.custom)) {
    const era = eras.find((candidate) => item.year >= candidate.from && item.year <= candidate.to);
    const cell = era ? matrix[item.country]?.[era.id] : undefined;
    if (!cell) continue;
    cell.total += 1;
    if (hasVerifiedSources(item.sources)) cell.sourced += 1;
    if (item.body) cell.articles += 1;
    if (item.month && item.day) cell.exactDates += 1;
    if ((item.importance ?? 2) === 3) cell.milestones += 1;
  }

  return matrix;
}
