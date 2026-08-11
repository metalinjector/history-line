import type { TimelineItem } from '../types';

export const MONTHS_NOMINATIVE = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

export const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** Уровень точности, с которой известна дата объекта. */
export function resolutionOf(item: Pick<TimelineItem, 'month' | 'day'>): 'year' | 'month' | 'day' {
  if (item.day && item.month) return 'day';
  if (item.month) return 'month';
  return 'year';
}

/** Человекочитаемая дата объекта: «14 июля 1789», «июнь 1940» или «1789». */
export function formatItemDate(
  item: Pick<TimelineItem, 'year' | 'month' | 'day' | 'endYear' | 'dateLabel'>,
): string {
  const { year, month, day, endYear, dateLabel } = item;
  if (dateLabel) return dateLabel;
  if (day && month) return `${day} ${MONTHS_GENITIVE[month - 1]} ${formatYearLabel(year)}`;
  if (month) return `${MONTHS_NOMINATIVE[month - 1]} ${formatYearLabel(year)}`;
  if (endYear && endYear !== year) return `${formatYearLabel(year)}–${formatYearLabel(endYear)}`;
  return formatYearLabel(year);
}

/** Подпись года для колонки дат. Для первых веков добавляем пояснение. */
export function formatYearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year).toLocaleString('ru-RU')} до н. э.` : String(year);
}

/** Компактный диапазон эпохи без технического минуса у дат до нашей эры. */
export function formatEraRange(from: number, to: number): string {
  if (to > 2100) return `${formatYearLabel(from)}–наши дни`;
  if (from < 0 && to < 0) {
    return `${Math.abs(from).toLocaleString('ru-RU')}–${formatYearLabel(to)}`;
  }
  return `${formatYearLabel(from)}–${formatYearLabel(to)}`;
}

/** Склонение существительных по числу: 3 события, 21 событие, 5 событий. */
export function plural(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
}

/** Числовой ключ сортировки, устойчивый к отсутствию месяца и дня. */
export function timeKey(item: Pick<TimelineItem, 'year' | 'month' | 'day'>): number {
  return item.year * 10_000 + (item.month ?? 0) * 100 + (item.day ?? 0);
}
