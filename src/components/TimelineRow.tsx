import { memo } from 'react';
import type { Country, CountryId, TimelineGroup, TimelineItem } from '../types';
import { plural } from '../lib/format';
import { TimelineCard } from './TimelineCard';

type Props = {
  group: TimelineGroup;
  countries: Country[];
  selectedId?: string;
  selectedCountry?: CountryId;
  query: string;
  onSelect: (item: TimelineItem) => void;
};

/**
 * Одна строка шкалы: подпись даты слева и ячейки стран справа.
 *
 * Строка рендерится даже если объект есть только в одной стране —
 * пустые ячейки показывают, что в других странах в этот год ничего не отмечено.
 */
export const TimelineRow = memo(function TimelineRow({
  group,
  countries,
  selectedId,
  selectedCountry,
  query,
  onSelect,
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

      {countries.map((country) => {
        const items = group.byCountry[country.id] ?? [];
        return (
          <div
            className="tcell"
            role="gridcell"
            key={country.id}
            data-empty={items.length === 0 || undefined}
            data-selected-column={selectedCountry === country.id || undefined}
            style={
              {
                '--c': `hsl(${country.color})`,
                '--c-ink': `hsl(${country.colorInk})`,
              } as React.CSSProperties
            }
          >
            <span className="tcell__rail" aria-hidden="true" />
            {items.map((item) => (
              <TimelineCard
                key={item.id}
                item={item}
                country={country}
                selected={item.id === selectedId}
                query={query}
                onSelect={onSelect}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
});
