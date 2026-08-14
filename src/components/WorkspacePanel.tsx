import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { TimelineState } from '../lib/useTimelineState';
import { EditorialDashboard } from './EditorialDashboard';
import { MethodSection } from './MethodSection';
import { PeopleBuilder } from './PeopleBuilder';
import { ResearchTools } from './ResearchTools';
import { SiteFooter } from './SiteFooter';
import { StoryChooser } from './StoryPanel';
import {
  workspaceSectionById,
  workspaceSections,
  type WorkspaceSectionId,
} from './workspaceSections';
import './WorkspacePanel.css';

type Props = {
  activeSection: WorkspaceSectionId | null;
  state: TimelineState;
  onSectionChange: (section: WorkspaceSectionId) => void;
  onClose: () => void;
  onJumpToTimeline: () => void;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function WorkspacePanel({
  activeSection,
  state,
  onSectionChange,
  onClose,
  onJumpToTimeline,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const isOpen = activeSection !== null;

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  const returnToTimeline = onJumpToTimeline;

  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? workspaceSections.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + workspaceSections.length)
          % workspaceSections.length;
    const nextSection = workspaceSections[nextIndex];
    onSectionChange(nextSection.id);
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(`#workspace-tab-${nextSection.id}`)?.focus();
    });
  };

  const renderSection = (section: WorkspaceSectionId) => {
    switch (section) {
      case 'routes':
        return (
          <StoryChooser
            standalone
            stories={state.stories}
            activeStoryId={state.activeStory?.id}
            onStart={(storyId) => {
              state.goToStoryStep(storyId, 0);
              returnToTimeline();
            }}
          />
        );
      case 'research':
        return <ResearchTools state={state} />;
      case 'people':
        return (
          <PeopleBuilder
            addedPeople={state.addedPeople}
            allItems={state.allItems}
            onAdd={(draft, links) => {
              state.addPerson(draft, links);
              returnToTimeline();
            }}
            onRemove={state.removePerson}
            onSelect={(item) => {
              state.selectItem(item, { scroll: true });
              returnToTimeline();
            }}
          />
        );
      case 'editorial':
        return (
          <EditorialDashboard
            standalone
            items={state.allItems}
            countries={state.countries}
            onSelect={(countryId, eraId) => {
              state.stopStory();
              state.onlyCountry(countryId);
              state.setLayer('all');
              state.setQuery('');
              state.setKeyOnly(false);
              state.setTags([]);
              state.setPeriod({ type: 'era', id: eraId });
              returnToTimeline();
            }}
          />
        );
      case 'method':
        return (
          <>
            <MethodSection />
            <SiteFooter itemCount={state.totalStats.total} />
          </>
        );
    }
  };

  return (
    <AnimatePresence initial={false}>
      {activeSection ? (
        <motion.section
          ref={panelRef}
          id="workspace-panel"
          className="workspace-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-panel-title"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="workspace-panel__header">
            <div className="workspace-panel__header-inner shell">
              <div className="workspace-panel__heading">
                <span className="workspace-panel__glyph" aria-hidden="true">
                  {workspaceSectionById[activeSection].glyph}
                </span>
                <div>
                  <p className="eyebrow">Рабочие разделы</p>
                  <h2 id="workspace-panel-title">
                    {workspaceSectionById[activeSection].label}
                  </h2>
                  <p>{workspaceSectionById[activeSection].description}</p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--sm workspace-panel__close"
                onClick={onClose}
              >
                <span aria-hidden="true">×</span>
                Закрыть
              </button>
            </div>

            <nav className="workspace-panel__tabs shell" role="tablist" aria-label="Рабочие разделы">
              {workspaceSections.map((section, index) => (
                <button
                  key={section.id}
                  id={`workspace-tab-${section.id}`}
                  type="button"
                  role="tab"
                  aria-selected={section.id === activeSection}
                  aria-controls="workspace-tabpanel"
                  tabIndex={section.id === activeSection ? 0 : -1}
                  className="workspace-panel__tab"
                  onClick={() => onSectionChange(section.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <span aria-hidden="true">{section.glyph}</span>
                  {section.shortLabel}
                </button>
              ))}
            </nav>
          </header>

          <div className="workspace-panel__scroll">
            <motion.div
              key={activeSection}
              id="workspace-tabpanel"
              className="workspace-panel__content shell"
              role="tabpanel"
              aria-labelledby={`workspace-tab-${activeSection}`}
              tabIndex={0}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderSection(activeSection)}
            </motion.div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
