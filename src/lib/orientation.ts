import type { Orientation } from '../types';

/**
 * ⚠ КАРКАС — docs/CORE.md, раздел 2. Новая геометрия шкалы — только
 * в координатах «вдоль / поперёк времени» и для обеих ориентаций сразу.
 *
 * Ось времени: вертикальная или горизонтальная.
 *
 * Шкала устроена одинаково в обеих ориентациях: группы (годы, месяцы, дни)
 * идут вдоль оси времени, дорожки стран — поперёк неё. Меняется только то,
 * какая экранная координата чему соответствует. Поэтому геометрия здесь
 * записана в координатах «вдоль времени» (main) и «поперёк» (cross),
 * а в экранные x/y переводится одной функцией toScreen.
 */

export const DEFAULT_ORIENTATION: Orientation = 'vertical';

export const orientations: { id: Orientation; label: string; hint: string }[] = [
  { id: 'vertical', label: 'Вертикально', hint: 'Время идёт сверху вниз, страны стоят колонками' },
  {
    id: 'horizontal',
    label: 'Горизонтально',
    hint: 'Время идёт слева направо, страны лежат полосами, как в синхронистической таблице',
  },
];

export function isOrientation(value: unknown): value is Orientation {
  return value === 'vertical' || value === 'horizontal';
}

export type Point = { x: number; y: number };

/** Экранная точка из координат «вдоль времени / поперёк». */
export function toScreen(orientation: Orientation, main: number, cross: number): Point {
  return orientation === 'horizontal' ? { x: main, y: cross } : { x: cross, y: main };
}

/** Координата точки вдоль оси времени. */
export function mainOf(orientation: Orientation, point: Point): number {
  return orientation === 'horizontal' ? point.x : point.y;
}

/** Координата точки поперёк оси времени. */
export function crossOf(orientation: Orientation, point: Point): number {
  return orientation === 'horizontal' ? point.y : point.x;
}

/** Шаг навигации стрелками: вдоль времени или к соседней линии в том же моменте. */
export type NavigationStep = { axis: 'time' | 'lane'; delta: 1 | -1 };

const navigation: Record<Orientation, Record<string, NavigationStep>> = {
  vertical: {
    ArrowDown: { axis: 'time', delta: 1 },
    ArrowUp: { axis: 'time', delta: -1 },
    ArrowRight: { axis: 'lane', delta: 1 },
    ArrowLeft: { axis: 'lane', delta: -1 },
  },
  horizontal: {
    ArrowRight: { axis: 'time', delta: 1 },
    ArrowLeft: { axis: 'time', delta: -1 },
    ArrowDown: { axis: 'lane', delta: 1 },
    ArrowUp: { axis: 'lane', delta: -1 },
  },
};

/** Стрелка по оси времени всегда ведёт во время, поперёк — к соседней линии. */
export function navigationStep(orientation: Orientation, key: string): NavigationStep | undefined {
  return navigation[orientation][key];
}

type Segment = { from: Point; to: Point };

/** Штриховые линии выбранной карточки к оси дат. */
export type LeadShape = {
  /** Линия от оси дат к узлу карточки. */
  start: Segment;
  /** Для периода — линия к дате окончания; перемычка идёт от узла до её конца. */
  end?: Segment;
};

/**
 * Линии от выбранной карточки к оси дат.
 *
 * axisEdge — край оси дат поперёк времени: правый край колонки дат
 * или нижний край линейки лет. endMain — положение даты окончания периода
 * вдоль времени; слишком короткий период второй линии не получает.
 */
export function leadShape(orientation: Orientation, node: Point, axisEdge: number, endMain?: number): LeadShape {
  const nodeMain = mainOf(orientation, node);
  const shape: LeadShape = { start: { from: toScreen(orientation, nodeMain, axisEdge), to: node } };

  if (endMain !== undefined && Math.abs(endMain - nodeMain) > 4) {
    shape.end = {
      from: toScreen(orientation, endMain, axisEdge),
      to: toScreen(orientation, endMain, crossOf(orientation, node)),
    };
  }

  return shape;
}

/**
 * Нить-связь между двумя узлами: кубическая кривая, провисающая
 * в сторону более позднего времени — вниз в вертикальной шкале,
 * вправо в горизонтальной. Провисание тем заметнее, чем дальше
 * карточки друг от друга поперёк времени.
 */
export function threadShape(orientation: Orientation, a: Point, b: Point): { path: string; midpoint: Point } {
  const aMain = mainOf(orientation, a);
  const aCross = crossOf(orientation, a);
  const bMain = mainOf(orientation, b);
  const bCross = crossOf(orientation, b);
  const dMain = bMain - aMain;
  const dCross = bCross - aCross;
  const sag = Math.min(70, Math.max(10, Math.abs(dCross) * 0.18));

  const c1 = toScreen(orientation, aMain + dMain * 0.1 + sag, aCross + dCross * 0.3);
  const c2 = toScreen(orientation, bMain - dMain * 0.1 + sag, bCross - dCross * 0.3);

  return {
    path: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
    // Точка кривой при t = 0.5 — там сидит узелок-кнопка.
    midpoint: {
      x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
      y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
    },
  };
}

/**
 * Позиция прокрутки, при которой отрезок [start, start + size) виден целиком
 * в окне [scroll + sticky, scroll + frame): sticky — толщина липкой шапки
 * у начала окна. undefined — отрезок и так виден, двигать ничего не нужно.
 * Сдвиг минимальный и с небольшим запасом от края.
 */
export function revealScroll(
  start: number,
  size: number,
  scroll: number,
  frame: number,
  sticky = 0,
  margin = 12,
): number | undefined {
  if (start + size > scroll + frame) return start + size - frame + margin;
  if (start < scroll + sticky) return start - sticky - margin;
  return undefined;
}

/**
 * Как интерфейс называет дорожку страны: колонка в вертикальной шкале,
 * полоса — в горизонтальной. Оба слова женского рода и склоняются
 * одинаково, поэтому подписи собираются по одним и тем же шаблонам.
 */
export type LaneWords = {
  /** колонка / полоса */
  one: string;
  /** колонку / полосу */
  acc: string;
  /** колонки / полосы — родительный падеж */
  gen: string;
  /** колонке / полосе */
  prep: string;
  /** колонки / полосы — множественное число */
  many: string;
  /** Формы для plural(): 1 колонка, 3 колонки, 7 колонок. */
  counted: [string, string, string];
};

const laneVocabulary: Record<Orientation, LaneWords> = {
  vertical: {
    one: 'колонка',
    acc: 'колонку',
    gen: 'колонки',
    prep: 'колонке',
    many: 'колонки',
    counted: ['колонка', 'колонки', 'колонок'],
  },
  horizontal: {
    one: 'полоса',
    acc: 'полосу',
    gen: 'полосы',
    prep: 'полосе',
    many: 'полосы',
    counted: ['полоса', 'полосы', 'полос'],
  },
};

export function laneWords(orientation: Orientation): LaneWords {
  return laneVocabulary[orientation];
}
