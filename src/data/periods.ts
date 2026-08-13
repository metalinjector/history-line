import type { EraId, Period } from '../types';
import { eras } from './eras';

/**
 * Два способа выбрать отрезок времени.
 *
 * **Эпохи** — содержательные, с неровными границами: Античность кончается там,
 * где кончается римский мир, а не на круглой дате. Они хороши, когда читатель
 * думает категориями «Средневековье», «Век революций».
 *
 * **Интервалы** — механические, по 300 лет. Они хороши ровно тем, чем плохи
 * эпохи: границы предсказуемы, шаг одинаков, и видно, что в 601–900 годах
 * в одной части света пусто, а в другой густо. Ни один интервал не «объясняет»
 * время — он просто нарезает его поровну.
 *
 * Оба способа — одно и то же поле состояния `period`: выбран может быть
 * только один отрезок, иначе фильтр перестаёт читаться.
 */
export const INTERVAL_SPAN = 300;

/** Верхняя граница шкалы: округляется вверх до целого интервала. */
function intervalCeiling(maxYear: number): number {
  return Math.ceil(maxYear / INTERVAL_SPAN) * INTERVAL_SPAN;
}

/** Интервалы по 300 лет, покрывающие всю шкалу от первого года до `maxYear`. */
export function intervalPeriods(maxYear: number): { from: number; to: number }[] {
  const ceiling = intervalCeiling(Math.max(maxYear, INTERVAL_SPAN));
  const result: { from: number; to: number }[] = [];
  for (let from = 1; from <= ceiling; from += INTERVAL_SPAN) {
    result.push({ from, to: from + INTERVAL_SPAN - 1 });
  }
  return result;
}

/** Границы выбранного отрезка в годах. */
export function periodRange(period: Period): { from: number; to: number } {
  if (period.type === 'interval') return { from: period.from, to: period.to };
  const era = eras.find((item) => item.id === period.id);
  return era ? { from: era.from, to: era.to } : { from: 1, to: Number.MAX_SAFE_INTEGER };
}

/**
 * Попадает ли объект в отрезок.
 *
 * Проверяется пересечение, а не только год начала: Столетняя война (1337–1453)
 * видна и в интервале, где она началась, и в том, где закончилась. Иначе
 * длинный процесс исчезал бы из выборки ровно там, где он ещё шёл.
 */
export function periodContains(period: Period, year: number, endYear?: number): boolean {
  const { from, to } = periodRange(period);
  return year <= to && (endYear ?? year) >= from;
}

export function periodLabel(period: Period): string {
  if (period.type === 'interval') return `${period.from}–${period.to}`;
  return eras.find((item) => item.id === period.id)?.label ?? 'эпоха';
}

/**
 * Ключ для выпадающего списка и адресной строки.
 * `era:early-modern` или `int:1501`, где число — начало интервала.
 */
export function encodePeriod(period: Period): string {
  return period.type === 'era' ? `era:${period.id}` : `int:${period.from}`;
}

export function decodePeriod(value: string | null | undefined, maxYear: number): Period | undefined {
  if (!value) return undefined;

  const [type, rest] = value.split(':');
  if (type === 'era') {
    return eras.some((era) => era.id === rest) ? { type: 'era', id: rest as EraId } : undefined;
  }
  if (type === 'int') {
    const from = Number(rest);
    const match = intervalPeriods(maxYear).find((interval) => interval.from === from);
    return match ? { type: 'interval', ...match } : undefined;
  }
  return undefined;
}
