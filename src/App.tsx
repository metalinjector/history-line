import { useCallback, useRef, useState } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { Hero } from './components/Hero';
import { IntroNote } from './components/IntroNote';
import { TimelineSection } from './components/TimelineSection';
import { WorkspacePanel } from './components/WorkspacePanel';
import type { WorkspaceSectionId } from './components/workspaceSections';
import { useTimelineState } from './lib/useTimelineState';

export default function App() {
  const state = useTimelineState();
  const timelineRef = useRef<HTMLElement>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSectionId | null>(null);

  const closeWorkspace = useCallback(() => setActiveWorkspace(null), []);

  const jumpToTimeline = useCallback(() => {
    closeWorkspace();
    window.requestAnimationFrame(() => {
      timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [closeWorkspace]);

  return (
    <>
      <SiteHeader
        theme={state.theme}
        onToggleTheme={state.toggleTheme}
        onJumpToTimeline={jumpToTimeline}
        activeWorkspace={activeWorkspace}
        onOpenWorkspace={setActiveWorkspace}
        onCloseWorkspace={closeWorkspace}
      />

      <WorkspacePanel
        activeSection={activeWorkspace}
        state={state}
        onSectionChange={setActiveWorkspace}
        onClose={closeWorkspace}
        onJumpToTimeline={jumpToTimeline}
      />

      <main>
        <Hero
          itemCount={state.totalStats.total}
          minYear={state.totalStats.minYear}
          maxYear={state.totalStats.maxYear}
          onStart={jumpToTimeline}
        />

        <div className="shell">
          <IntroNote />
        </div>

        <TimelineSection state={state} sectionRef={timelineRef} />
      </main>
    </>
  );
}
