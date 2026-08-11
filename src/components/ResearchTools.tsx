import { useCallback, useState } from 'react';
import type { TimelineState } from '../lib/useTimelineState';
import {
  buildResearchSession,
  researchSessionToMarkdown,
  type ResearchSession,
} from '../lib/researchExport';
import './ResearchTools.css';

type Props = { state: TimelineState };

function downloadFile(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyCurrentUrl(): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(window.location.href);
    return;
  }
  const field = document.createElement('textarea');
  field.value = window.location.href;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}

export function ResearchTools({ state }: Props) {
  const [status, setStatus] = useState('');
  const [printSession, setPrintSession] = useState<ResearchSession>();

  const createSession = useCallback(
    () =>
      buildResearchSession(state.filteredItems, state.notes, {
        countries: state.activeCountryIds,
        kind: state.layer,
        query: state.query,
        keyOnly: state.keyOnly,
        showBce: state.showBce,
        era: state.era,
        tags: state.tags,
        zoom: state.zoom,
        layers: state.activeLayerIds,
        columnGroups: state.columnGroups,
      }),
    [state],
  );

  const notify = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(''), 2600);
  };

  return (
    <>
      <section className="research-tools" aria-label="Поделиться и экспортировать исследование">
        <div>
          <b>Исследовательская сессия</b>
          <span>{state.filteredItems.length} объектов · фильтры и открытая карточка уже записаны в URL</span>
        </div>
        <div className="research-tools__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={async () => {
              try {
                await copyCurrentUrl();
                notify('Ссылка скопирована');
              } catch {
                notify('Не удалось скопировать — скопируйте адрес браузера');
              }
            }}
          >
            ↗ Ссылка
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const session = createSession();
              downloadFile(JSON.stringify(session, null, 2), 'application/json', 'history-line-session.json');
              notify('JSON сохранён');
            }}
          >
            {`{ }`} JSON
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              downloadFile(researchSessionToMarkdown(createSession()), 'text/markdown;charset=utf-8', 'history-line-session.md');
              notify('Markdown сохранён');
            }}
          >
            ↓ Markdown
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const session = createSession();
              setPrintSession(session);
              notify('Откроется системный диалог печати');
              window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
            }}
          >
            ⎙ PDF / печать
          </button>
        </div>
        <span className="research-tools__status" role="status" aria-live="polite">{status}</span>
      </section>

      {printSession ? <ResearchPrint session={printSession} /> : null}
    </>
  );
}

function ResearchPrint({ session }: { session: ResearchSession }) {
  return (
    <article className="research-print">
      <header>
        <h1>History Line — исследовательская сессия</h1>
        <p>Сформировано: {new Date(session.generatedAt).toLocaleString('ru-RU')}</p>
        <p>
          Страны: {session.filters.countries.join(', ')} · тип: {session.filters.kind} ·
          эпоха: {session.filters.era ?? 'все'} · до н. э.: {session.filters.showBce ? 'показаны' : 'скрыты'} · объектов: {session.items.length}
        </p>
      </header>
      {session.items.map((item) => (
        <section key={item.id}>
          <h2>{item.year} · {item.title}</h2>
          <p>{item.summary}</p>
          <p>{item.detail}</p>
          {item.note ? <blockquote>Личная заметка: {item.note}</blockquote> : null}
          {item.sources?.length ? (
            <div>
              <b>Источники</b>
              <ul>{item.sources.map((source, index) => <li key={index}>{source.label}{source.url ? ` — ${source.url}` : ''}</li>)}</ul>
            </div>
          ) : null}
        </section>
      ))}
    </article>
  );
}
