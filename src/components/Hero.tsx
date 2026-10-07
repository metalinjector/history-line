import { useCallback, useRef } from 'react';
import { countries, countryById, defaultCountryIds } from '../data/countries';
import { formatYearLabel, plural } from '../lib/format';
import './Hero.css';

type Props = {
  itemCount: number;
  minYear: number;
  maxYear: number;
  onStart: () => void;
};

/** Позиции точек на декоративных линиях: доля высоты колонки. */
const nodePattern: number[][] = [
  [0.08, 0.31, 0.52, 0.74, 0.9],
  [0.04, 0.22, 0.46, 0.63, 0.83],
  [0.12, 0.36, 0.58, 0.79],
  [0.06, 0.27, 0.41, 0.67, 0.88],
  [0.18, 0.44, 0.71, 0.95],
  [0.1, 0.33, 0.55, 0.86],
  [0.02, 0.25, 0.49, 0.7, 0.92],
  [0.15, 0.39, 0.61, 0.81],
];

const heroCountries = defaultCountryIds.map((id) => countryById[id]);

export function Hero({ itemCount, minYear, maxYear, onStart }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  // Лёгкий параллакс: линии реагируют на движение мыши по сцене.
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const node = stageRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty('--px', x.toFixed(4));
    node.style.setProperty('--py', y.toFixed(4));
  }, []);

  const handleMouseLeave = useCallback(() => {
    const node = stageRef.current;
    if (!node) return;
    node.style.setProperty('--px', '0');
    node.style.setProperty('--py', '0');
  }, []);

  return (
    <section className="hero" id="top">
      <div className="hero__inner shell">
        {/* Появление по очереди задаёт CSS: см. .hero__copy > * в Hero.css */}
        <div className="hero__copy">
          <p className="eyebrow">
            Синхронная хронология · {formatYearLabel(minYear)} — {maxYear}
          </p>

          <h1 className="hero__title">
            <span>История — это не список дат,</span>
            <span>
              а <em>одновременность</em>.
            </span>
          </h1>

          <p className="hero__lede lede">
            Современные страны, исторические государства и международные процессы идут параллельными
            линиями — от первых людей до сегодняшнего дня. Каталог не ограничен одним регионом: можно
            сопоставить Древний Египет и Месопотамию, революции Европы и Америки, деколонизацию Азии и
            Африки или собрать собственный набор линий.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--primary hero__cta" onClick={onStart}>
              Открыть хронологию
              <span aria-hidden="true">↓</span>
            </button>
            <a className="btn btn--ghost" href="#method">
              Как читать эту карту
            </a>
          </div>

          <dl className="hero__stats">
            <div>
              <dt>Линий в каталоге</dt>
              <dd>{countries.length}</dd>
            </div>
            <div>
              <dt>{plural(itemCount, ['Объект', 'Объекта', 'Объектов'])}</dt>
              <dd>{itemCount}</dd>
            </div>
            <div>
              <dt>Охват</dt>
              <dd>3+ млн лет</dd>
            </div>
          </dl>
        </div>

        <div
          className="hero__stage"
          ref={stageRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-hidden="true"
        >
          <div className="hero__stage-inner">
            {heroCountries.map((country, index) => (
              <div
                className="hero__lane"
                key={country.id}
                style={
                  {
                    '--lane-color': `hsl(${country.color})`,
                    '--lane-index': index,
                  } as React.CSSProperties
                }
              >
                <span className="hero__lane-line" />
                {nodePattern[index % nodePattern.length].map((position, nodeIndex) => (
                  <span
                    className="hero__node"
                    key={position}
                    style={{ top: `${position * 100}%`, '--node-index': nodeIndex } as React.CSSProperties}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Подписи вынесены из-под маски, иначе их съедает градиентное затухание */}
          <div className="hero__legend">
            {heroCountries.map((country) => (
              <span key={country.id} style={{ '--lane-color': `hsl(${country.color})` } as React.CSSProperties}>
                {country.short}
              </span>
            ))}
          </div>

          <div className="hero__stage-glow" />
        </div>
      </div>

      <div className="hero__scroll-hint">
        <span className="eyebrow">Листайте вниз</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  );
}
