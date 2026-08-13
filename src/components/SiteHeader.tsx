import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ThemeName } from '../types';
import {
  workspaceSectionById,
  workspaceSections,
  type WorkspaceSectionId,
} from './workspaceSections';
import './SiteHeader.css';

type Props = {
  theme: ThemeName;
  onToggleTheme: () => void;
  onJumpToTimeline: () => void;
  activeWorkspace: WorkspaceSectionId | null;
  onOpenWorkspace: (section: WorkspaceSectionId) => void;
  onCloseWorkspace: () => void;
};

export function SiteHeader({
  theme,
  onToggleTheme,
  onJumpToTimeline,
  activeWorkspace,
  onOpenWorkspace,
  onCloseWorkspace,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [menuOpen]);

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
            onCloseWorkspace();
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
          <button
            type="button"
            className="site-header__link site-header__timeline-link"
            aria-current={activeWorkspace ? undefined : 'page'}
            onClick={onJumpToTimeline}
          >
            Хронология
          </button>

          <div className="site-header__menu" ref={menuRef}>
            <button
              type="button"
              className="site-header__link site-header__menu-trigger"
              aria-expanded={menuOpen}
              aria-controls="site-sections-menu"
              aria-label={`${menuOpen ? 'Закрыть' : 'Открыть'} меню разделов`}
              data-active={activeWorkspace || undefined}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="site-header__menu-label">Разделы</span>
              <span className="site-header__menu-icon" aria-hidden="true">☰</span>
              {activeWorkspace ? (
                <span className="site-header__active-section">
                  {workspaceSectionById[activeWorkspace].shortLabel}
                </span>
              ) : null}
              <span className="site-header__chevron" aria-hidden="true">⌄</span>
            </button>

            {menuOpen ? (
              <motion.div
                id="site-sections-menu"
                className="site-header__dropdown"
                initial={{ opacity: 0, y: -7, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="site-header__dropdown-head">
                  <b>Рабочие разделы</b>
                  <span>Открываются поверх шкалы и не сбивают её позицию</span>
                </div>
                <div className="site-header__dropdown-grid">
                  {workspaceSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className="site-header__dropdown-item"
                      data-active={section.id === activeWorkspace || undefined}
                      onClick={() => {
                        onOpenWorkspace(section.id);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="site-header__dropdown-glyph" aria-hidden="true">
                        {section.glyph}
                      </span>
                      <span>
                        <b>{section.shortLabel}</b>
                        <small>{section.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </div>
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
