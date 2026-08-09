import { memo } from 'react';
import type { CountryId, TimelineColumn, TimelineGroup, TimelineItem } from '../types';
import { plural } from '../lib/format';
import { TimelineCard } from './TimelineCard';

type Props = {
  group: TimelineGroup;
  columns: TimelineColumn[];
  selectedId?: string;
  selectedCountry?: CountryId;
  query: string;
  onSelect: (item: TimelineItem) => void;
  onOpen: (item: TimelineItem) => void;
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
  selectedId,
  selectedCountry,
  query,
  onSelect,
  onOpen,
}: Props) {
  const isSelectedRow = group.items.some((item) => item.id === selectedId);

  return (
    <div
      className="trow"
      data-weight={group.weight}
      data-active={isSelectedRow || undefined}
      role="row"
      id={`row-${group.key}`}
    >
      <div className="trow__date" role="rowheader">
        <span className="trow__date-inner">
          <span className="trow__year">{group.label}</span>
          <span className="trow__count">
            {group.items.length > 1
              ? `${group.items.length} ${plural(group.items.length, ['объект', 'объекта', 'объектов'])}`
              : ''}
          </span>
        </span>
        <span className="trow__tick" aria-hidden="true" />
      </div>

      {columns.map((column) => {
        const items = group.byColumn[column.id] ?? [];
        const holdsSelected = column.countries.some((country) => country.id === selectedCountry);

        return (
          <div
            className="tcell"
            role="gridcell"
            key={column.id}
            data-empty={items.length === 0 || undefined}
            data-shared={column.shared || undefined}
            data-selected-column={holdsSelected || undefined}
            style={{ '--rail-n': column.countries.length } as React.CSSProperties}
          >
            {column.countries.map((country, index) => (
              <span
                className="tcell__rail"
                key={country.id}
                aria-hidden="true"
                style={
                  {
                    '--rail-i': index,
                    '--c': `hsl(${country.color})`,
                  } as React.CSSProperties
                }
              />
            ))}

            {items.map((item) => {
              const railIndex = column.countries.findIndex((country) => country.id === item.country);
              const country = column.countries[railIndex] ?? column.countries[0];

              return (
                <TimelineCard
                  key={item.id}
                  item={item}
                  country={country}
                  selected={item.id === selectedId}
                  query={query}
                  railIndex={Math.max(0, railIndex)}
                  railCount={column.countries.length}
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
