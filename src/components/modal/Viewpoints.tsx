import type { SourceLink, Viewpoint } from '../../types';
import { sourceKindLabel } from '../../lib/markdown';
import { MarkdownView } from './MarkdownView';

type Props = {
  viewpoints?: Viewpoint[];
  sources?: SourceLink[];
  onOpenItem?: (id: string) => void;
};

/**
 * Разные устоявшиеся трактовки факта и список источников.
 *
 * Трактовки различаются оттенком и обязательно подписаны: чья это точка зрения.
 * Мы не выбираем «правильную» — задача шкалы показать, что расхождение есть,
 * и назвать стороны.
 */
export function Viewpoints({ viewpoints, sources, onOpenItem }: Props) {
  const hasViewpoints = viewpoints && viewpoints.length > 0;
  if (!hasViewpoints && (!sources || sources.length === 0)) return null;

  return (
    <>
      {hasViewpoints ? (
        <section className="views">
          <h3 className="views__title">
            Разные трактовки
            <span className="views__hint">
              сам факт не оспаривается — расходятся оценки; ниже указано, чья это позиция
            </span>
          </h3>

          <div className="views__list">
            {viewpoints.map((viewpoint) => (
              <article className="view" key={viewpoint.id} data-tone={viewpoint.tone}>
                <header className="view__head">
                  <span className="view__mark" aria-hidden="true" />
                  <h4>{viewpoint.label}</h4>
                </header>
                <div className="view__body md">
                  <MarkdownView onOpenItem={onOpenItem}>{viewpoint.text.trim()}</MarkdownView>
                </div>
                {viewpoint.sources && viewpoint.sources.length > 0 ? (
                  <ul className="view__sources">
                    {viewpoint.sources.map((source) => (
                      <li key={source.label}>
                        <SourceItem source={source} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {sources && sources.length > 0 ? (
        <section className="sources">
          <h3 className="sources__title">Источники</h3>
          <ul className="sources__list">
            {sources.map((source) => (
              <li key={source.label}>
                <SourceItem source={source} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function SourceItem({ source }: { source: SourceLink }) {
  const content = (
    <>
      <span className="source__kind">{sourceKindLabel(source.kind)}</span>
      <span className="source__label">{source.label}</span>
    </>
  );

  return source.url ? (
    <a className="source" href={source.url} target="_blank" rel="noopener noreferrer">
      {content}
      <span className="source__arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  ) : (
    <span className="source">{content}</span>
  );
}
