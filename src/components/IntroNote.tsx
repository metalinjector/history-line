import { motion } from 'framer-motion';
import { countries } from '../data/countries';
import './IntroNote.css';

/**
 * Обязательное пояснение перед хронологией: ранние события привязаны
 * не к современным государствам, а к территориям и традициям.
 */
export function IntroNote() {
  return (
    <motion.section
      className="intro-note"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
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
          <summary>Что именно означает каждая колонка</summary>
          <ul className="intro-note__list">
            {countries.map((country) => (
              <li key={country.id} style={{ '--c': `hsl(${country.color})` } as React.CSSProperties}>
                <span className="intro-note__dot" aria-hidden="true" />
                <b>{country.label}.</b> {country.note}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </motion.section>
  );
}
