import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { Orientation, Relation, TimelineGroup, TimelineItem } from '../types';
import { isRelationVerified } from '../lib/provenance';
import { leadShape, threadShape, type LeadShape, type Point } from '../lib/orientation';
import { countryById } from '../data/countries';

type SelectionShape = LeadShape & { color: string };

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
  /** Куда идёт время: от этого зависит, какая координата узла — дата. */
  orientation: Orientation;
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
 * в какой колонке стоит карточка, сколько линий делят дорожку, какой сейчас
 * масштаб и куда идёт время. Геометрия считается в координатах «вдоль
 * времени / поперёк» (lib/orientation.ts) и поворачивается вместе со шкалой.
 * Пересчёт идёт в useLayoutEffect — до отрисовки кадра, без мигания.
 */
export function TimelineOverlay({
  gridRef,
  groups,
  selectedItem,
  relations,
  layoutKey,
  orientation,
  onRelationClick,
}: Props) {
  const [selection, setSelection] = useState<SelectionShape | undefined>();
  const [threads, setThreads] = useState<ThreadShape[]>([]);
  const [hovered, setHovered] = useState<string | undefined>();

  const horizontal = orientation === 'horizontal';

  /**
   * Положение произвольного года вдоль оси времени.
   * Если группы с таким годом нет, позиция интерполируется между соседними —
   * так конец периода попадает между строками (столбцами горизонтальной
   * шкалы), а не прыгает на ближайшую.
   */
  const mainForYear = useCallback(
    (grid: HTMLElement, year: number): number | undefined => {
      const gridRect = grid.getBoundingClientRect();
      const gridStart = horizontal ? gridRect.left : gridRect.top;
      const groupMain = (key: string) => {
        const row = document.getElementById(`row-${key}`);
        if (!row) return undefined;
        const rect = row.getBoundingClientRect();
        const start = horizontal ? rect.left : rect.top;
        const size = horizontal ? rect.width : rect.height;
        return start - gridStart + Math.min(size / 2, 34);
      };

      let before: { year: number; main: number } | undefined;
      let after: { year: number; main: number } | undefined;

      for (const group of groups) {
        const main = groupMain(group.key);
        if (main === undefined) continue;
        if (group.year === year) return main;
        if (group.year < year) before = { year: group.year, main };
        else {
          after = { year: group.year, main };
          break;
        }
      }

      if (before && after) {
        const ratio = (year - before.year) / (after.year - before.year);
        return before.main + (after.main - before.main) * ratio;
      }
      return before?.main ?? after?.main;
    },
    [groups, horizontal],
  );

  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      setSelection(undefined);
      setThreads([]);
      return;
    }

    // Край оси дат поперёк времени: правый край колонки дат
    // или нижний край линейки лет — отсюда начинаются штриховые линии.
    const corner = grid.querySelector<HTMLElement>('.thead__date');
    const axisEdge = (horizontal ? corner?.offsetHeight : corner?.offsetWidth) ?? 0;

    // --- Штриховые линии выбранной карточки ---
    const point = selectedItem ? nodeCenter(grid, selectedItem.id) : undefined;
    if (selectedItem && point) {
      const endMain =
        selectedItem.endYear && selectedItem.endYear !== selectedItem.year
          ? mainForYear(grid, selectedItem.endYear)
          : undefined;
      setSelection({
        color: `hsl(${countryById[selectedItem.country].color})`,
        ...leadShape(orientation, point, axisEdge, endMain),
      });
    } else {
      setSelection(undefined);
    }

    // --- Нити связей ---
    const shapes: ThreadShape[] = [];
    for (const relation of relations) {
      const a = nodeCenter(grid, relation.from);
      const b = nodeCenter(grid, relation.to);
      if (!a || !b) continue;

      shapes.push({
        relation,
        ...threadShape(orientation, a, b),
        active: selectedItem
          ? relation.from === selectedItem.id || relation.to === selectedItem.id
          : false,
      });
    }

    setThreads(shapes);
  }, [gridRef, horizontal, mainForYear, orientation, relations, selectedItem]);

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
          data-verification={isRelationVerified(thread.relation) ? 'verified' : 'draft'}
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
              {/* Перемычка вдоль дорожки: показывает длительность периода */}
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
