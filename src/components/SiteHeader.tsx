import { useEffect, useRef, useState } from 'react';
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
  // На узком экране ссылки на разделы прячутся в меню под кнопкой.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const themeLabel = theme === 'parchment' ? 'Ночной атлас' : 'Пергамент';

  return (
    <header className="site-header">
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

        <div className="site-header__menu" ref={menuRef}>
          <button
            type="button"
            className="btn btn--sm site-header__menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
            <span className="visually-hidden">Разделы сайта</span>
          </button>

          <nav className="site-header__nav" id="site-nav" aria-label="Разделы сайта" data-open={menuOpen || undefined}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="site-header__link"
                onClick={(event) => {
                  setMenuOpen(false);
                  if (link.href !== '#timeline') return;
                  event.preventDefault();
                  onJumpToTimeline();
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <button
          type="button"
          className="btn btn--sm site-header__theme"
          onClick={onToggleTheme}
          aria-pressed={theme === 'atlas'}
          aria-label={themeLabel}
          title={theme === 'parchment' ? 'Включить тёмную тему' : 'Включить пергаментную тему'}
        >
          <span aria-hidden="true">{theme === 'parchment' ? '☾' : '☀'}</span>
          <span className="site-header__theme-label" aria-hidden="true">
            {themeLabel}
          </span>
        </button>
      </div>
    </header>
  );
}
