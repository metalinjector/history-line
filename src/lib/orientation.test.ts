import { describe, expect, it } from 'vitest';
import { plural } from './format';
import { isOrientation, laneWords, leadShape, navigationStep, revealScroll, threadShape, type Point } from './orientation';

const transpose = (point: Point): Point => ({ x: point.y, y: point.x });

describe('ориентация шкалы', () => {
  it('стрелка вдоль оси времени ведёт во время, поперёк — к соседней линии', () => {
    expect(navigationStep('vertical', 'ArrowDown')).toEqual({ axis: 'time', delta: 1 });
    expect(navigationStep('vertical', 'ArrowLeft')).toEqual({ axis: 'lane', delta: -1 });
    expect(navigationStep('horizontal', 'ArrowRight')).toEqual({ axis: 'time', delta: 1 });
    expect(navigationStep('horizontal', 'ArrowUp')).toEqual({ axis: 'lane', delta: -1 });
    expect(navigationStep('horizontal', 'Enter')).toBeUndefined();
  });

  it('в вертикальной шкале нить рисуется прежней кривой', () => {
    const a = { x: 120, y: 340 };
    const b = { x: 610, y: 980 };
    // Формула, по которой нити рисовались до появления горизонтальной шкалы.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const sag = Math.min(70, Math.max(10, Math.abs(dx) * 0.18));
    const c1 = { x: a.x + dx * 0.3, y: a.y + dy * 0.1 + sag };
    const c2 = { x: b.x - dx * 0.3, y: b.y - dy * 0.1 + sag };

    expect(threadShape('vertical', a, b).path).toBe(
      `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
    );
  });

  it('горизонтальная нить — та же кривая, повёрнутая вместе с осью времени', () => {
    const a = { x: 340, y: 120 };
    const b = { x: 980, y: 610 };
    const horizontal = threadShape('horizontal', a, b);
    const vertical = threadShape('vertical', transpose(a), transpose(b));

    expect(horizontal.midpoint.x).toBeCloseTo(vertical.midpoint.y);
    expect(horizontal.midpoint.y).toBeCloseTo(vertical.midpoint.x);
  });

  it('нить провисает в сторону более позднего времени', () => {
    const vertical = threadShape('vertical', { x: 100, y: 500 }, { x: 700, y: 500 });
    expect(vertical.midpoint.y).toBeGreaterThan(500);
    expect(vertical.midpoint.x).toBeCloseTo(400);

    const horizontal = threadShape('horizontal', { x: 500, y: 100 }, { x: 500, y: 700 });
    expect(horizontal.midpoint.x).toBeGreaterThan(500);
    expect(horizontal.midpoint.y).toBeCloseTo(400);
  });

  it('штриховая линия идёт от оси дат к узлу, у периода — ещё и к дате окончания', () => {
    const node = { x: 420, y: 260 };

    expect(leadShape('vertical', node, 100)).toEqual({ start: { from: { x: 100, y: 260 }, to: node } });
    expect(leadShape('vertical', node, 100, 900).end).toEqual({ from: { x: 100, y: 900 }, to: { x: 420, y: 900 } });

    expect(leadShape('horizontal', node, 50).start.from).toEqual({ x: 420, y: 50 });
    expect(leadShape('horizontal', node, 50, 1300).end).toEqual({
      from: { x: 1300, y: 50 },
      to: { x: 1300, y: 260 },
    });
  });

  it('не рисует вторую линию для периода короче нескольких пикселей', () => {
    expect(leadShape('horizontal', { x: 420, y: 260 }, 50, 423).end).toBeUndefined();
  });

  it('досдвигает поле ровно настолько, чтобы карточка вошла целиком', () => {
    // Окно 0–600 с липкой линейкой 50 px сверху.
    expect(revealScroll(100, 120, 0, 600, 50)).toBeUndefined();
    expect(revealScroll(560, 120, 0, 600, 50)).toBe(560 + 120 - 600 + 12);
    expect(revealScroll(30, 120, 0, 600, 50)).toBe(30 - 50 - 12);
  });

  it('называет дорожку колонкой или полосой и склоняет по числу', () => {
    expect(plural(7, laneWords('vertical').counted)).toBe('колонок');
    expect(plural(22, laneWords('horizontal').counted)).toBe('полосы');
    expect(`своя ${laneWords('horizontal').one}`).toBe('своя полоса');
  });

  it('отличает допустимую ориентацию от мусора из хранилища', () => {
    expect(isOrientation('horizontal')).toBe(true);
    expect(isOrientation('diagonal')).toBe(false);
    expect(isOrientation(undefined)).toBe(false);
  });
});
