import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Relation, TimelineGroup, TimelineItem } from '../types';
import { countryById } from '../data/countries';

type Point = { x: number; y: number };

type SelectionShape = {
  color: string;
  /** Линия к дате начала. */
  start: { from: Point; to: Point };
  /** Линия к дате окончания периода и вертикальная перемычка между ними. */
  end?: { from: Point; to: Point };
};

type ThreadShape = {
  relation: Relation;
  path: string;
  /** Точка на кривой при t = 0.5 — там сидит узелок-кнопка. */
  midpoint: Point;
  /** Связь касается выбранной карточки — рисуется ярче. */
  active: boolean;
};

type Props = {
  gridRef: React.RefObject<HTMLDivElement | null>;
  groups: TimelineGroup[];
  selectedItem?: TimelineItem;
  relations: Relation[];
  /** Любое изменение раскладки: масштаб, колонки, фильтры. */
  layoutKey: string;
  onRelationClick: (relation: Relation) => void;
};

/** Центр узла карточки в координатах сетки. */
function nodeCenter(grid: HTMLElement, itemId: string): Point | undefined {
  const node = document.getElementById(`item-${itemId}`)?.querySelector('.tcard__node');
  if (!node) return undefined;
  const gridRect = grid.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left - gridRect.left + rect.width / 2,
    y: rect.top - gridRect.top + rect.height / 2,
  };
}

/**
 * Слой поверх сетки: штриховые линии от выбранной карточки к дате
 * и нити-связи между событиями разных стран.
 *
 * Всё рисуется по измеренным позициям узлов, поэтому не зависит от того,
 * в какой колонке стоит карточка, сколько линий делят дорожку и какой сейчас
 * масштаб. Пересчёт идёт в useLayoutEffect — до отрисовки кадра, без мигания.
 */
export function TimelineOverlay({
  gridRef,
  groups,
  selectedItem,
  relations,
  layoutKey,
  onRelationClick,
}: Props) {
  const [selection, setSelection] = useState<SelectionShape | undefined>();
  const [threads, setThreads] = useState<ThreadShape[]>([]);
  const [hovered, setHovered] = useState<string | undefined>();

  /**
   * Вертикальная координата произвольного года.
   * Если строки с таким годом нет, позиция интерполируется между соседними —
   * так конец периода попадает между строками, а не прыгает на ближайшую.
   */
  const yForYear = useCallback(
    (grid: HTMLElement, year: number): number | undefined => {
      const gridTop = grid.getBoundingClientRect().top;
      const rowY = (key: string) => {
        const row = document.getElementById(`row-${key}`);
        if (!row) return undefined;
        const rect = row.getBoundingClientRect();
        return rect.top - gridTop + Math.min(rect.height / 2, 34);
      };

      let before: { year: number; y: number } | undefined;
      let after: { year: number; y: number } | undefined;

      for (const group of groups) {
        const y = rowY(group.key);
        if (y === undefined) continue;
        if (group.year === year) return y;
        if (group.year < year) before = { year: group.year, y };
        else {
          after = { year: group.year, y };
          break;
        }
      }

      if (before && after) {
        const ratio = (year - before.year) / (after.year - before.year);
        return before.y + (after.y - before.y) * ratio;
      }
      return before?.y ?? after?.y;
    },
    [groups],
  );

  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      setSelection(undefined);
      setThreads([]);
      return;
    }

    // Правый край колонки дат — отсюда начинаются штриховые линии.
    const dateEdge = grid.querySelector<HTMLElement>('.thead__date')?.offsetWidth ?? 0;

    // --- Штриховые линии выбранной карточки ---
    if (selectedItem) {
      const point = nodeCenter(grid, selectedItem.id);
      if (point) {
        const color = `hsl(${countryById[selectedItem.country].color})`;
        const shape: SelectionShape = {
          color,
          start: { from: { x: dateEdge, y: point.y }, to: point },
        };

        if (selectedItem.endYear && selectedItem.endYear !== selectedItem.year) {
          const endY = yForYear(grid, selectedItem.endYear);
          if (endY !== undefined && Math.abs(endY - point.y) > 4) {
            shape.end = {
              from: { x: dateEdge, y: endY },
              to: { x: point.x, y: endY },
            };
          }
        }

        setSelection(shape);
      } else {
        setSelection(undefined);
      }
    } else {
      setSelection(undefined);
    }

    // --- Нити связей ---
    const shapes: ThreadShape[] = [];
    for (const relation of relations) {
      const a = nodeCenter(grid, relation.from);
      const b = nodeCenter(grid, relation.to);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      // Провисание тем заметнее, чем дальше карточки друг от друга по горизонтали.
      const sag = Math.min(70, Math.max(10, Math.abs(dx) * 0.18));
      const c1 = { x: a.x + dx * 0.3, y: a.y + dy * 0.1 + sag };
      const c2 = { x: b.x - dx * 0.3, y: b.y - dy * 0.1 + sag };

      shapes.push({
        relation,
        path: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
        midpoint: {
          x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
          y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
        },
        active: selectedItem
          ? relation.from === selectedItem.id || relation.to === selectedItem.id
          : false,
      });
    }

    setThreads(shapes);
  }, [gridRef, relations, selectedItem, yForYear]);

  useLayoutEffect(() => {
    measure();
  }, [measure, layoutKey]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(grid);
    return () => observer.disconnect();
  }, [gridRef, measure]);

  if (!selection && threads.length === 0) return null;

  return (
    <svg className="overlay" aria-hidden="true">
      {/* Нити связей рисуются под линиями выбора */}
      {threads.map((thread) => (
        <g
          key={thread.relation.id}
          className="thread"
          data-kind={thread.relation.kind}
          data-active={thread.active || undefined}
          data-hovered={hovered === thread.relation.id || undefined}
        >
          <path className="thread__line" d={thread.path} />
          <path
            className="thread__hit"
            d={thread.path}
            data-no-pan
            onPointerEnter={() => setHovered(thread.relation.id)}
            onPointerLeave={() => setHovered(undefined)}
            onClick={() => onRelationClick(thread.relation)}
          >
            <title>{thread.relation.label}</title>
          </path>
          <circle
            className="thread__knot"
            cx={thread.midpoint.x}
            cy={thread.midpoint.y}
            r={hovered === thread.relation.id ? 7 : 5}
            data-no-pan
            onPointerEnter={() => setHovered(thread.relation.id)}
            onPointerLeave={() => setHovered(undefined)}
            onClick={() => onRelationClick(thread.relation)}
          >
            <title>{thread.relation.label}</title>
          </circle>
        </g>
      ))}

      {selection ? (
        <g className="lead" style={{ '--c': selection.color } as React.CSSProperties}>
          <line
            className="lead__line"
            x1={selection.start.from.x}
            y1={selection.start.from.y}
            x2={selection.start.to.x}
            y2={selection.start.to.y}
          />
          <circle className="lead__cap" cx={selection.start.from.x} cy={selection.start.from.y} r={3.5} />

          {selection.end ? (
            <>
              <line
                className="lead__line"
                x1={selection.end.from.x}
                y1={selection.end.from.y}
                x2={selection.end.to.x}
                y2={selection.end.to.y}
              />
              <circle className="lead__cap" cx={selection.end.from.x} cy={selection.end.from.y} r={3.5} />
              {/* Перемычка вдоль колонки: показывает длительность периода */}
              <line
                className="lead__span"
                x1={selection.start.to.x}
                y1={selection.start.to.y}
                x2={selection.end.to.x}
                y2={selection.end.to.y}
              />
            </>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}
