import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { countries } from '../data/countries';
import { plural } from '../lib/format';
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

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
        <motion.div
          className="hero__copy"
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.09, delayChildren: 0.12 }}
        >
          <motion.p className="eyebrow" variants={fadeUp} transition={{ duration: 0.6 }}>
            Синхронная хронология · {minYear} — {maxYear}
          </motion.p>

          <motion.h1 className="hero__title" variants={fadeUp} transition={{ duration: 0.75 }}>
            <span>История — это не список дат,</span>
            <span>
              а <em>одновременность</em>.
            </span>
          </motion.h1>

          <motion.p className="hero__lede lede" variants={fadeUp} transition={{ duration: 0.7 }}>
            Восемь стран идут параллельными линиями по одной вертикальной шкале — от первого года нашей эры
            до сегодняшнего дня. Видно сразу: пока Германия печатает первые книги, Полоцк отправляет Скорину
            в Прагу; пока Париж строит республику, Речь Посполитая исчезает с карты; пока Берлин делит стену,
            над Землёй летит первый человек.
          </motion.p>

          <motion.div className="hero__actions" variants={fadeUp} transition={{ duration: 0.6 }}>
            <button type="button" className="btn btn--primary hero__cta" onClick={onStart}>
              Открыть хронологию
              <span aria-hidden="true">↓</span>
            </button>
            <a className="btn btn--ghost" href="#method">
              Как читать эту карту
            </a>
          </motion.div>

          <motion.dl className="hero__stats" variants={fadeUp} transition={{ duration: 0.6 }}>
            <div>
              <dt>Стран</dt>
              <dd>{countries.length}</dd>
            </div>
            <div>
              <dt>{plural(itemCount, ['Объект', 'Объекта', 'Объектов'])}</dt>
              <dd>{itemCount}</dd>
            </div>
            <div>
              <dt>Лет на шкале</dt>
              <dd>{maxYear - minYear + 1}</dd>
            </div>
          </motion.dl>
        </motion.div>

        <div
          className="hero__stage"
          ref={stageRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-hidden="true"
        >
          <div className="hero__stage-inner">
            {countries.map((country, index) => (
              <motion.div
                className="hero__lane"
                key={country.id}
                style={
                  {
                    '--lane-color': `hsl(${country.color})`,
                    '--lane-index': index,
                  } as React.CSSProperties
                }
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 + index * 0.07, duration: 0.5 }}
              >
                <motion.span
                  className="hero__lane-line"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.35 + index * 0.07, duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                />
                {nodePattern[index].map((position, nodeIndex) => (
                  <motion.span
                    className="hero__node"
                    key={position}
                    style={{ top: `${position * 100}%` }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.75 + index * 0.07 + nodeIndex * 0.08,
                      duration: 0.45,
                      ease: [0.22, 1.4, 0.36, 1],
                    }}
                  />
                ))}
              </motion.div>
            ))}
          </div>

          {/* Подписи вынесены из-под маски, иначе их съедает градиентное затухание */}
          <div className="hero__legend">
            {countries.map((country) => (
              <span key={country.id} style={{ '--lane-color': `hsl(${country.color})` } as React.CSSProperties}>
                {country.short}
              </span>
            ))}
          </div>

          <div className="hero__stage-glow" />
        </div>
      </div>

      <motion.div
        className="hero__scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <span className="eyebrow">Листайте вниз</span>
        <span className="hero__scroll-line" />
      </motion.div>
    </section>
  );
}
