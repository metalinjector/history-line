import type { HistoricalLineSpan } from '../types';

export type RailSegment = 'full' | 'start' | 'end' | 'single';

/**
 * Какая часть цветной линии существует в конкретной строке шкалы.
 *
 * Несколько строк могут относиться к одному году при помесячном/подневном
 * масштабе. Поэтому начало ставится на первой строке года, а окончание — на
 * последней: линия не обрывается перед событиями декабря того же года.
 */
export function railSegmentForYear(
  lineSpan: HistoricalLineSpan | undefined,
  year: number,
  previousYear?: number,
  nextYear?: number,
): RailSegment | undefined {
  if (!lineSpan) return 'full';
  if (year < lineSpan.from || year > lineSpan.to) return undefined;

  const startsHere = year === lineSpan.from && previousYear !== year;
  const endsHere = year === lineSpan.to && nextYear !== year;

  if (startsHere && endsHere) return 'single';
  if (startsHere) return 'start';
  if (endsHere) return 'end';
  return 'full';
}
