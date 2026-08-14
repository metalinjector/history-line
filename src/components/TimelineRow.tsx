import { memo } from 'react';
import type { CountryId, TimelineColumn, TimelineGroup, TimelineItem } from '../types';
import { countryById } from '../data/countries';
import { trackOfItem } from '../lib/layers';
import { plural } from '../lib/format';
import { railSegmentForYear } from '../lib/timelineRail';
import { TimelineCard } from './TimelineCard';

const countryColor = (id: CountryId) => `hsl(${countryById[id].color})`;

type Props = {
  group: TimelineGroup;
  columns: TimelineColumn[];
  previousYear?: number;
  nextYear?: number;
  selectedId?: string;
  selectedCountry?: CountryId;
  query: string;
  onSelect: (item: TimelineItem) => void;
  onOpen: (item: TimelineItem) => void;
  /** Открыть окно со всеми событиями этого года. */
  onOpenDay: (key: string) => void;
};

/**
 * Одна строка шкалы: подпись даты слева и ячейки колонок справа.
 *
 * Строка рендерится, даже если объект есть только в одной стране, — пустые ячейки
 * показывают, что в остальных линиях в этот год ничего не отмечено.
 * В общей колонке на две страны рисуются две шкалы, и цвет узла говорит,
 * к какой из них относится карточка.
 */
export const TimelineRow = memo(function TimelineRow({
  group,
  columns,
  previousYear,
  nextYear,
  selectedId,
  selectedCountry,
  query,
  onSelect,
  onOpen,
  onOpenDay,
}: Props) {
  const isSelectedRow = group.items.some((item) => item.id === selectedId);

  /** Страны, чьи линии сошлись в этой строке. */
  const countriesHere = Array.from(new Set(group.items.map((item) => item.country)));
  const isCrossroads = countriesHere.length > 1;

  /** Границы, попавшие в этот год; одна линия может быть унаследована колонкой. */
  const lineBoundaries = Array.from(
    new Map(
      columns
        .flatMap((column) => column.tracks)
        .filter(
          (track) =>
            track.lineSpan &&
            ((track.lineSpan.from === group.year && previousYear !== group.year) ||
              (track.lineSpan.to === group.year && nextYear !== group.year)),
        )
        .map((track) => [track.id, track]),
    ).values(),
  );
  const hasLineStarts = lineBoundaries.some(
    (track) => track.lineSpan?.from === group.year && previousYear !== group.year,
  );
  const hasLineEnds = lineBoundaries.some(
    (track) => track.lineSpan?.to === group.year && nextYear !== group.year,
  );
  const boundaryCaption = hasLineStarts && hasLineEnds
    ? 'границы линий'
    : hasLineStarts
      ? 'начало линии'
      : 'конец линии';
  const boundaryTitle = lineBoundaries
    .map((track) => {
      const edges = [
        track.lineSpan?.from === group.year && previousYear !== group.year ? 'начало' : '',
        track.lineSpan?.to === group.year && nextYear !== group.year ? 'окончание' : '',
      ].filter(Boolean).join(' и ');
      return `${track.label}: ${edges}${track.lineSpan?.approximate ? ' (принятая периодизация)' : ''}`;
    })
    .join('\n');

  const dateInner = (
    <span className="trow__date-inner">
      <span className="trow__year">{group.label}</span>
      {group.sublabel ? <span className="trow__sub">{group.sublabel}</span> : null}
      {lineBoundaries.length > 0 ? (
        <span className="trow__line-boundary" title={boundaryTitle}>
          {boundaryCaption}
        </span>
      ) : null}
    </span>
  );

  return (
    <div
      className="trow"
      data-weight={group.weight}
      data-active={isSelectedRow || undefined}
      data-crossroads={isCrossroads || undefined}
      role="row"
      id={`row-${group.key}`}
    >
      <div className="trow__date" role="rowheader">
        {isCrossroads ? (
          // Год, в котором сошлись линии нескольких стран, обведён кольцом
          // из их цветов и открывает окно со всеми событиями сразу.
          <button
            type="button"
            className="trow__crossroads"
            onClick={() => onOpenDay(group.key)}
            title={`${group.label}: события ${countriesHere.length} стран — открыть все`}
            style={
              {
                '--ring': `conic-gradient(${countriesHere
                  .map((id, index) => {
                    const from = Math.round((index / countriesHere.length) * 100);
                    const to = Math.round(((index + 1) / countriesHere.length) * 100);
                    return `${countryColor(id)} ${from}% ${to}%`;
                  })
                  .join(', ')})`,
              } as React.CSSProperties
            }
          >
            <span className="trow__crossroads-ring" aria-hidden="true" />
            {dateInner}
            <span className="trow__crossroads-count" aria-hidden="true">
              {countriesHere.length}
            </span>
            <span className="visually-hidden">
              Открыть все события {group.label} года: {group.items.length}{' '}
              {plural(group.items.length, ['объект', 'объекта', 'объектов'])} в{' '}
              {countriesHere.length} странах
            </span>
          </button>
        ) : dateInner}
        <span className="trow__tick" aria-hidden="true" />
      </div>

      {columns.map((column) => {
        const items = group.byColumn[column.id] ?? [];
        const holdsSelected = column.tracks.some((track) => track.countryId === selectedCountry);

        return (
          <div
            className="tcell"
            role="gridcell"
            key={column.id}
            data-empty={items.length === 0 || undefined}
            data-shared={column.shared || undefined}
            data-selected-column={holdsSelected || undefined}
            data-layer-only={column.layerOnly || undefined}
            style={{ '--rail-n': column.tracks.length } as React.CSSProperties}
          >
            {column.tracks.map((track, index) => {
              const segment = railSegmentForYear(
                track.lineSpan,
                group.year,
                previousYear,
                nextYear,
              );
              if (!segment) return null;

              return (
                <span
                  className="tcell__rail"
                  key={track.id}
                  data-kind={track.kind}
                  data-segment={segment}
                  data-track={track.id}
                  aria-hidden="true"
                  style={
                    {
                      '--rail-i': index,
                      '--c': `hsl(${track.color})`,
                    } as React.CSSProperties
                  }
                />
              );
            })}

            {items.map((item) => {
              const railIndex = trackOfItem(item, column);
              const track = column.tracks[railIndex] ?? column.tracks[0];

              return (
                <TimelineCard
                  key={item.id}
                  item={item}
                  track={track}
                  selected={item.id === selectedId}
                  query={query}
                  railIndex={railIndex}
                  railCount={column.tracks.length}
                  shared={column.shared}
                  onSelect={onSelect}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
});
