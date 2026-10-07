import type { TimelineColumn, TimelineGroup, TimelineItem } from '../types';
import { trackOfItem } from './layers';

/**
 * Кусок полосы периода внутри одной группы шкалы.
 *
 * Шкала не пропорциональна годам и виртуализирована, поэтому полоса
 * не рисуется одним элементом от начала до конца: каждая группа, которую
 * период покрывает, рисует в своей ячейке свой кусок. Соседние группы
 * стоят вплотную, и куски складываются в непрерывную полосу — какие бы
 * группы ни были сейчас отрисованы.
 */
export type PeriodSegment = {
  item: TimelineItem;
  columnId: string;
  /** Дорожка внутри колонки: на её линии лежит полоса. */
  track: number;
  /** Ряд среди пересекающихся периодов той же дорожки: 0 — на самой линии. */
  slot: number;
  /** В какую сторону от линии уходят следующие ряды: наружу от соседней дорожки. */
  side: 1 | -1;
  /** Группа самого объекта: полоса начинается от узла его карточки. */
  starts: boolean;
  /** Группа года окончания: полоса заканчивается на её отметке. */
  ends: boolean;
};

/**
 * Раскладывает объекты с endYear по группам: ключ — индекс группы,
 * значение — куски полос, которые в ней видны. Конец периода — последняя
 * группа не позже endYear; если отметки ровно этого года в выборке нет,
 * полоса доходит до края последней группы перед ним.
 */
export function periodSegments(groups: TimelineGroup[], columns: TimelineColumn[]): Map<number, PeriodSegment[]> {
  type Period = { item: TimelineItem; column: TimelineColumn; track: number; start: number; end: number };
  const periodsByTrack = new Map<string, Period[]>();

  groups.forEach((group, start) => {
    for (const column of columns) {
      for (const item of group.byColumn[column.id] ?? []) {
        if (item.endYear === undefined || item.endYear <= item.year) continue;
        const track = trackOfItem(item, column);
        const key = `${column.id}|${track}`;
        const list = periodsByTrack.get(key) ?? [];
        list.push({ item, column, track, start, end: lastGroupUpTo(groups, item.endYear, start) });
        periodsByTrack.set(key, list);
      }
    }
  });

  const segments = new Map<number, PeriodSegment[]>();
  for (const periods of periodsByTrack.values()) {
    // Ряды раздаются жадно, как полосы в диаграмме Ганта: период встаёт
    // в первый ряд, где предыдущий период уже закончился.
    periods.sort((a, b) => a.start - b.start || b.end - a.end);
    const rowEnds: number[] = [];
    for (const period of periods) {
      let slot = rowEnds.findIndex((end) => end < period.start);
      if (slot < 0) slot = rowEnds.length;
      rowEnds[slot] = period.end;

      const trackCount = period.column.tracks.length;
      const side = period.track < (trackCount - 1) / 2 ? -1 : 1;
      for (let index = period.start; index <= period.end; index++) {
        const list = segments.get(index) ?? [];
        list.push({
          item: period.item,
          columnId: period.column.id,
          track: period.track,
          slot,
          side,
          starts: index === period.start,
          ends: index === period.end && index > period.start && groups[index].year === period.item.endYear,
        });
        segments.set(index, list);
      }
    }
  }
  return segments;
}

/** Индекс последней группы не позже year, но не раньше from. Группы отсортированы по времени. */
function lastGroupUpTo(groups: TimelineGroup[], year: number, from: number): number {
  let low = from;
  let high = groups.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (groups[middle].year <= year) low = middle + 1;
    else high = middle;
  }
  return Math.max(from, low - 1);
}
