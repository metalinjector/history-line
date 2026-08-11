import { useCallback, useRef } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { Hero } from './components/Hero';
import { IntroNote } from './components/IntroNote';
import { TimelineSection } from './components/TimelineSection';
import { PeopleBuilder } from './components/PeopleBuilder';
import { MethodSection } from './components/MethodSection';
import { SiteFooter } from './components/SiteFooter';
import { useTimelineState } from './lib/useTimelineState';

export default function App() {
  const state = useTimelineState();
  const timelineRef = useRef<HTMLElement>(null);

  const jumpToTimeline = useCallback(() => {
    timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <SiteHeader
        theme={state.theme}
        onToggleTheme={state.toggleTheme}
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

        <PeopleBuilder
          addedPeople={state.addedPeople}
          allItems={state.allItems}
          onAdd={state.addPerson}
          onRemove={state.removePerson}
          onSelect={(item) => state.selectItem(item, { scroll: true })}
        />

        <MethodSection />
      </main>

      <SiteFooter itemCount={state.totalStats.total} />
    </>
  );
}
