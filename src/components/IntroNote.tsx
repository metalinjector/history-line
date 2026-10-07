import { useRef, useState } from 'react';
import { countries, countryById } from '../data/countries';
import { useReveal } from '../lib/useReveal';
import type { CountryId } from '../types';
import './IntroNote.css';

type Props = {
  /** Линии на шкале в порядке колонок, включая унаследованные древние. */
  lineIds: CountryId[];
};

/**
 * Обязательное пояснение перед хронологией: ранние события привязаны
 * не к современным государствам, а к территориям и традициям.
 *
 * Пояснения показываются к линиям, которые сейчас на шкале: каталог
 * насчитывает больше сотни линий, и полный список был бы стеной текста.
 * Весь каталог открывается отдельной кнопкой.
 */
export function IntroNote({ lineIds }: Props) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  const [showAll, setShowAll] = useState(false);

  const shown = showAll ? countries : lineIds.map((id) => countryById[id]).filter(Boolean);

  return (
    <section className="intro-note" ref={ref} data-reveal>
      <div className="intro-note__card panel">
        <div className="intro-note__main">
          <span className="intro-note__seal" aria-hidden="true">
            ⚖
          </span>
          <div>
            <p className="eyebrow">Важная оговорка</p>
            <p className="intro-note__text">
              Границы стран менялись. Поэтому ранние события привязаны не к современным государствам в
              строгом смысле, а к территориям, политическим традициям и культурным линиям.
            </p>
          </div>
        </div>

        <details className="intro-note__details">
          <summary>Что именно означает каждая линия на шкале</summary>
          <ul className="intro-note__list">
            {shown.map((country) => (
              <li key={country.id} style={{ '--c': `hsl(${country.color})` } as React.CSSProperties}>
                <span className="intro-note__dot" aria-hidden="true" />
                <b>{country.label}.</b> {country.note}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--ghost btn--sm intro-note__more"
            aria-pressed={showAll}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? `Только линии на шкале (${lineIds.length})` : `Все линии каталога (${countries.length})`}
          </button>
        </details>
      </div>
    </section>
  );
}
