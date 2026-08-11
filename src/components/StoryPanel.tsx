import type { Story, TimelineItem } from '../types';
import './StoryPanel.css';

type Props = {
  stories: Story[];
  activeStory?: Story;
  step: number;
  activeItem?: TimelineItem;
  onStep: (storyId: string, step: number, options?: { open?: boolean }) => void;
  onStop: () => void;
};

export function StoryPanel({ stories, activeStory, step, activeItem, onStep, onStop }: Props) {
  if (!activeStory) {
    return (
      <section className="stories" aria-labelledby="stories-title">
        <div className="stories__intro">
          <div>
            <p className="eyebrow">Кураторские маршруты</p>
            <h3 id="stories-title">Пройти сюжет шаг за шагом</h3>
          </div>
          <p>Маршрут временно уберёт мешающие фильтры, покажет нужную страну и проведёт по карточкам.</p>
        </div>
        <div className="stories__grid">
          {stories.map((story) => (
            <article className="story-card" key={story.id}>
              <span className="story-card__meta">{story.steps.length} шагов · ≈ {story.minutes} мин</span>
              <h4>{story.title}</h4>
              <p>{story.summary}</p>
              <button type="button" className="btn btn--sm" onClick={() => onStep(story.id, 0)}>
                Начать маршрут →
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const current = activeStory.steps[step] ?? activeStory.steps[0];
  const currentStep = activeStory.steps.indexOf(current);
  return (
    <section className="stories stories--active" aria-labelledby="active-story-title">
      <header className="story-player__head">
        <div>
          <span className="story-player__meta">Маршрут · {currentStep + 1}/{activeStory.steps.length}</span>
          <h3 id="active-story-title">{activeStory.title}</h3>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onStop}>Завершить</button>
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
