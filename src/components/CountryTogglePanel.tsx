import type { Country, CountryId } from '../types';
import './CountryTogglePanel.css';

type Props = {
  countries: Country[];
  activeIds: CountryId[];
  counts: Record<string, number>;
  onToggle: (id: CountryId) => void;
  onShowAll: () => void;
  onOnly: (id: CountryId) => void;
};

/**
 * Переключатели стран.
 * Последнюю видимую страну скрыть нельзя — иначе хронология опустеет.
 */
export function CountryTogglePanel({
  countries,
  activeIds,
  counts,
  onToggle,
  onShowAll,
  onOnly,
}: Props) {
  const activeSet = new Set(activeIds);
  const allVisible = activeIds.length === countries.length;

  return (
    <div className="country-toggles" role="group" aria-label="Показать или скрыть страны">
      <div className="country-toggles__list">
        {countries.map((country) => {
          const active = activeSet.has(country.id);
          const isLast = active && activeIds.length === 1;

          return (
            // Две кнопки в одной «таблетке»: переключение видимости и режим «только эта».
            // Вложенные кнопки недопустимы, поэтому контейнер — обычный div.
            <div
              className="country-chip"
              data-active={active || undefined}
              key={country.id}
              style={
                {
                  '--c': `hsl(${country.color})`,
                  '--c-ink': `hsl(${country.colorInk})`,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className="country-chip__main"
                aria-pressed={active}
                disabled={isLast}
                title={
                  isLast
                    ? 'Нельзя скрыть последнюю страну'
                    : active
                      ? `Скрыть «${country.label}»`
                      : `Показать «${country.label}»`
                }
                onClick={() => onToggle(country.id)}
              >
                <span className="country-chip__dot" aria-hidden="true" />
                <span className="country-chip__label">{country.label}</span>
                <span className="country-chip__count">{counts[country.id] ?? 0}</span>
              </button>

              <button
                type="button"
                className="country-chip__only"
                onClick={() => onOnly(country.id)}
                title={`Показать только «${country.label}»`}
              >
                <span aria-hidden="true">только</span>
                <span className="visually-hidden">Показать только страну {country.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn--sm country-toggles__all"
        onClick={onShowAll}
        disabled={allVisible}
      >
        Показать все
      </button>
    </div>
  );
}
