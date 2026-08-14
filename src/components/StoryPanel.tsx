import type { Story, TimelineItem } from '../types';
import './StoryPanel.css';

/**
 * Маршруты разделены на две части не случайно.
 *
 * **Выбор маршрута** — это не настройка и не фильтр, а отдельное занятие,
 * поэтому список сюжетов живёт в рабочем меню верхней панели: читатель может
 * открыть его из любой точки длинной шкалы, не теряя текущую позицию.
 *
 * **Плеер** — наоборот, появляется над шкалой и только когда маршрут запущен:
 * пока он идёт, это главное, что происходит на экране.
 */

type ChooserProps = {
  stories: Story[];
  activeStoryId?: string;
  onStart: (storyId: string) => void;
  standalone?: boolean;
};

export function StoryChooser({ stories, activeStoryId, onStart, standalone = false }: ChooserProps) {
  const heading = (
    <>
      <span>
        <b>Кураторские маршруты</b>
        <small>пройти сюжет шаг за шагом: маршрут сам покажет нужную страну и проведёт по карточкам</small>
      </span>
      <span className="stories__count">{stories.length}</span>
    </>
  );

  const grid = (
    <div className="stories__grid">
      {stories.map((story) => (
        <article className="story-card" key={story.id} data-active={story.id === activeStoryId || undefined}>
          <span className="story-card__meta">
            {story.steps.length} шагов · ≈ {story.minutes} мин
          </span>
          <h4>{story.title}</h4>
          <p>{story.summary}</p>
          <button type="button" className="btn btn--sm" onClick={() => onStart(story.id)}>
            {story.id === activeStoryId ? 'Начать заново →' : 'Начать маршрут →'}
          </button>
        </article>
      ))}
    </div>
  );

  if (standalone) {
    return (
      <section className="stories stories--workspace" aria-label="Кураторские маршруты">
        <header className="stories__head">{heading}</header>
        {grid}
      </section>
    );
  }

  return (
    <details className="stories">
      <summary>{heading}</summary>
      {grid}
    </details>
  );
}

type PlayerProps = {
  activeStory?: Story;
  step: number;
  activeItem?: TimelineItem;
  onStep: (storyId: string, step: number, options?: { open?: boolean }) => void;
  onStop: () => void;
};

export function StoryPlayer({ activeStory, step, activeItem, onStep, onStop }: PlayerProps) {
  if (!activeStory) return null;

  const current = activeStory.steps[step] ?? activeStory.steps[0];
  const currentStep = activeStory.steps.indexOf(current);

  return (
    <section className="stories stories--active" aria-labelledby="active-story-title">
      <header className="story-player__head">
        <div>
          <span className="story-player__meta">
            Маршрут · {currentStep + 1}/{activeStory.steps.length}
          </span>
          <h3 id="active-story-title">{activeStory.title}</h3>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onStop}>
          Завершить
        </button>
      </header>

      <ol className="story-player__rail" aria-label="Шаги маршрута">
        {activeStory.steps.map((routeStep, index) => (
          <li key={routeStep.itemId}>
            <button
              type="button"
              aria-current={index === currentStep ? 'step' : undefined}
              onClick={() => onStep(activeStory.id, index)}
              title={`${index + 1}. ${routeStep.title}`}
            >
              <span>{index + 1}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="story-player__current">
        <div>
          <span className="story-player__year">{activeItem?.year ?? '—'}</span>
          <h4>{current.title}</h4>
          <p>{current.note}</p>
        </div>
        <div className="story-player__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={currentStep === 0}
            onClick={() => onStep(activeStory.id, currentStep - 1)}
          >
            ← Назад
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={!activeItem}
            onClick={() => onStep(activeStory.id, currentStep, { open: true })}
          >
            Читать карточку
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={currentStep === activeStory.steps.length - 1}
            onClick={() => onStep(activeStory.id, currentStep + 1)}
          >
            Дальше →
          </button>
        </div>
      </div>
    </section>
  );
}
