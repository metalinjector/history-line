import { useMemo } from 'react';
import type { Country, CountryId, EraId, TimelineItem } from '../types';
import { eras } from '../data/eras';
import { buildEditorialMatrix } from '../lib/editorialMetrics';
import { formatEraRange } from '../lib/format';
import './EditorialDashboard.css';

type Props = {
  items: TimelineItem[];
  countries: Country[];
  onSelect: (country: CountryId, era: EraId) => void;
  standalone?: boolean;
};

export function EditorialDashboard({ items, countries, onSelect, standalone = false }: Props) {
  const matrix = useMemo(
    () => buildEditorialMatrix(items, countries.map((country) => country.id), eras),
    [countries, items],
  );
  const total = items.filter((item) => !item.custom && !item.layerId).length;
  const sourced = countries.reduce(
    (sum, country) => sum + eras.reduce((eraSum, era) => eraSum + matrix[country.id][era.id].sourced, 0),
    0,
  );

  const heading = (
    <>
      <span>
        <b>Редакторская матрица</b>
        <small>страна × эпоха: объекты, источники, статьи, точные даты и вехи</small>
      </span>
      <span className="editorial__coverage">Источники: {sourced}/{total}</span>
    </>
  );

  const body = (
    <div className="editorial__body">
      <p className="editorial__legend">
        В ячейке: <b>всего</b> · И источники · С статьи · Д точные даты · ★ вехи.
        Нажатие применяет страну и эпоху как фильтр.
      </p>
      <div className="editorial__scroll">
        <table>
          <thead>
            <tr>
              <th>Линия</th>
              {eras.map((era) => <th key={era.id} title={era.label}>{formatEraRange(era.from, era.to)}</th>)}
            </tr>
          </thead>
          <tbody>
            {countries.map((country) => (
              <tr key={country.id}>
                <th>{country.short}</th>
                {eras.map((era) => {
                  const cell = matrix[country.id][era.id];
                  return (
                    <td key={era.id}>
                      <button
                        type="button"
                        data-empty={cell.total === 0 || undefined}
                        onClick={() => onSelect(country.id, era.id)}
                        title={`${country.label} · ${era.label}`}
                      >
                        <b>{cell.total}</b>
                        <span>И{cell.sourced} С{cell.articles} Д{cell.exactDates} ★{cell.milestones}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <section className="editorial editorial--workspace" aria-label="Редакторская матрица">
        <header className="editorial__head">{heading}</header>
        {body}
      </section>
    );
  }

  return (
    <details className="editorial">
      <summary>{heading}</summary>
      {body}
    </details>
  );
}
