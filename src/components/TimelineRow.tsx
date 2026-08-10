import { memo } from 'react';
import type { CountryId, TimelineColumn, TimelineGroup, TimelineItem } from '../types';
import { countryById } from '../data/countries';
import { plural } from '../lib/format';
import { TimelineCard } from './TimelineCard';

const countryColor = (id: CountryId) => `hsl(${countryById[id].color})`;

type Props = {
  group: TimelineGroup;
  columns: TimelineColumn[];
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
            <span className="trow__date-inner">
              <span className="trow__year">{group.label}</span>
              {group.sublabel ? <span className="trow__sub">{group.sublabel}</span> : null}
            </span>
            <span className="trow__crossroads-count" aria-hidden="true">
              {countriesHere.length}
            </span>
            <span className="visually-hidden">
              Открыть все события {group.label} года: {group.items.length}{' '}
              {plural(group.items.length, ['объект', 'объекта', 'объектов'])} в{' '}
              {countriesHere.length} странах
            </span>
          </button>
        ) : (
          <span className="trow__date-inner">
            <span className="trow__year">{group.label}</span>
            {group.sublabel ? <span className="trow__sub">{group.sublabel}</span> : null}
          </span>
        )}
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
