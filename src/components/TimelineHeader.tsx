import type { Country, CountryId } from '../types';

type Props = {
  countries: Country[];
  selectedCountry?: CountryId;
  onHide: (id: CountryId) => void;
  canHide: boolean;
};

/**
 * Строка стран. Прилипает к верхнему краю поля хронологии при прокрутке.
 * Горизонтальная синхронизация с телом таблицы получается сама собой:
 * шапка и строки лежат в одном контейнере прокрутки.
 */
export function TimelineHeader({ countries, selectedCountry, onHide, canHide }: Props) {
  return (
    <div className="thead" role="row">
      <div className="thead__date" role="columnheader">
        <span className="thead__date-label">Год</span>
      </div>

      {countries.map((country) => (
        <div
          className="thead__cell"
          role="columnheader"
          key={country.id}
          data-selected={selectedCountry === country.id || undefined}
          style={
            {
              '--c': `hsl(${country.color})`,
              '--c-ink': `hsl(${country.colorInk})`,
            } as React.CSSProperties
          }
        >
          <div className="thead__cell-inner">
            <span className="thead__dot" aria-hidden="true" />
            <span className="thead__labels">
              <span className="thead__label">{country.label}</span>
              <span className="thead__short">{country.short}</span>
            </span>
            {canHide ? (
              <button
                type="button"
                className="thead__hide"
                onClick={() => onHide(country.id)}
                title={`Скрыть колонку «${country.label}»`}
              >
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Скрыть колонку {country.label}</span>
              </button>
            ) : null}
          </div>
          <span className="thead__underline" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
