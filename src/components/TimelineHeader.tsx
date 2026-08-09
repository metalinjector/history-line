import type { CountryId, TimelineColumn } from '../types';

type Props = {
  columns: TimelineColumn[];
  selectedCountry?: CountryId;
  onHide: (id: CountryId) => void;
  canHide: boolean;
};

/**
 * Строка колонок. Прилипает к верхнему краю поля хронологии при прокрутке.
 * Горизонтальная синхронизация с телом таблицы получается сама собой:
 * шапка и строки лежат в одном контейнере прокрутки.
 *
 * Колонка на две страны показывает обе подписи и обе точки — так видно,
 * что линии делят одну дорожку, и понятно, какой цвет чему соответствует.
 */
export function TimelineHeader({ columns, selectedCountry, onHide, canHide }: Props) {
  return (
    <div className="thead" role="row">
      <div className="thead__date" role="columnheader">
        <span className="thead__date-label">Год</span>
      </div>

      {columns.map((column) => {
        const holdsSelected = column.countries.some((country) => country.id === selectedCountry);

        return (
          <div
            className="thead__cell"
            role="columnheader"
            key={column.id}
            data-shared={column.shared || undefined}
            data-selected={holdsSelected || undefined}
          >
            <div className="thead__stack">
              {column.countries.map((country) => (
                <div
                  className="thead__line"
                  key={country.id}
                  style={
                    {
                      '--c': `hsl(${country.color})`,
                      '--c-ink': `hsl(${country.colorInk})`,
                    } as React.CSSProperties
                  }
                  data-selected={selectedCountry === country.id || undefined}
                >
                  <span className="thead__dot" aria-hidden="true" />
                  <span className="thead__label">{country.label}</span>
                  <span className="thead__short">{country.short}</span>
                  {canHide ? (
                    <button
                      type="button"
                      className="thead__hide"
                      onClick={() => onHide(country.id)}
                      title={`Скрыть линию «${country.label}»`}
                    >
                      <span aria-hidden="true">×</span>
                      <span className="visually-hidden">Скрыть линию {country.label}</span>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <span className="thead__underline" aria-hidden="true">
              {column.countries.map((country) => (
                <span key={country.id} style={{ background: `hsl(${country.color})` }} />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
