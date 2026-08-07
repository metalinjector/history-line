import { motion } from 'framer-motion';
import type { ThemeName } from '../types';
import './SiteHeader.css';

type Props = {
  theme: ThemeName;
  onToggleTheme: () => void;
  onJumpToTimeline: () => void;
};

const links = [
  { href: '#timeline', label: 'Хронология' },
  { href: '#builder', label: 'Персоналии' },
  { href: '#method', label: 'Как это устроено' },
];

export function SiteHeader({ theme, onToggleTheme, onJumpToTimeline }: Props) {
  return (
    <motion.header
      className="site-header"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="site-header__inner shell">
        <a
          className="site-header__brand"
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="site-header__mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="site-header__name">
            Синхрония
            <span className="site-header__sub">атлас параллельной истории</span>
          </span>
        </a>

        <nav className="site-header__nav" aria-label="Разделы сайта">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="site-header__link"
              onClick={(event) => {
                if (link.href !== '#timeline') return;
                event.preventDefault();
                onJumpToTimeline();
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="btn btn--sm site-header__theme"
          onClick={onToggleTheme}
          aria-pressed={theme === 'atlas'}
          title={theme === 'parchment' ? 'Включить тёмную тему' : 'Включить пергаментную тему'}
        >
          <span aria-hidden="true">{theme === 'parchment' ? '☾' : '☀'}</span>
          {theme === 'parchment' ? 'Ночной атлас' : 'Пергамент'}
        </button>
      </div>
    </motion.header>
  );
}
