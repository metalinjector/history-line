import type { SourceLink, TimelineItem } from '../types';
import { formatYearLabel } from './format';

export type ResearchFilters = {
  countries: string[];
  kind: string;
  query: string;
  keyOnly: boolean;
  period?: string;
  showBce: boolean;
  tags: string[];
  zoom: number;
  layers: string[];
  columnGroups: string[][];
};

export type ResearchSessionItem = Pick<
  TimelineItem,
  'id' | 'country' | 'year' | 'month' | 'day' | 'kind' | 'title' | 'summary' | 'detail' | 'tags' | 'importance'
> & { note?: string; sources?: SourceLink[] };

export type ResearchSession = {
  schema: 'history-line/research-session@1';
  generatedAt: string;
  filters: ResearchFilters;
  items: ResearchSessionItem[];
};

export function buildResearchSession(
  items: TimelineItem[],
  notes: Record<string, string>,
  filters: ResearchFilters,
  generatedAt = new Date().toISOString(),
): ResearchSession {
  return {
    schema: 'history-line/research-session@1',
    generatedAt,
    filters,
    items: items.map((item) => ({
      id: item.id,
      country: item.country,
      year: item.year,
      month: item.month,
      day: item.day,
      kind: item.kind,
      title: item.title,
      summary: item.summary,
      detail: item.detail,
      tags: item.tags,
      importance: item.importance,
      note: notes[item.id]?.trim() || undefined,
      sources: item.sources,
    })),
  };
}

export function researchSessionToMarkdown(session: ResearchSession): string {
  const filterLines = [
    `- Страны: ${session.filters.countries.join(', ') || 'все'}`,
    `- Тип: ${session.filters.kind}`,
    `- Период: ${session.filters.period ?? 'вся шкала'}`,
    `- Поиск: ${session.filters.query || 'нет'}`,
    `- Теги: ${session.filters.tags.join(', ') || 'нет'}`,
    `- Только вехи: ${session.filters.keyOnly ? 'да' : 'нет'}`,
    `- Даты до н. э.: ${session.filters.showBce ? 'показаны' : 'скрыты'}`,
    `- Масштаб: ${session.filters.zoom}`,
    `- Слои: ${session.filters.layers.join(', ') || 'нет'}`,
    `- Общие колонки: ${session.filters.columnGroups.map((group) => group.join(' + ')).join('; ') || 'нет'}`,
  ];

  const items = session.items.map((item) => {
    const sources = item.sources?.length
      ? `\n\nИсточники:\n${item.sources.map((source) => `- ${source.label}${source.url ? ` — ${source.url}` : ''}`).join('\n')}`
      : '';
    const note = item.note ? `\n\n> Личная заметка: ${item.note.replaceAll('\n', '\n> ')}` : '';
    return `## ${formatYearLabel(item.year)} · ${item.title}\n\n${item.summary}\n\n${item.detail}${note}${sources}`;
  });

  return [
    '# Исследовательская сессия History Line',
    '',
    `Экспортировано: ${session.generatedAt}`,
    '',
    '## Фильтры',
    '',
    ...filterLines,
    '',
    `## Выборка (${session.items.length})`,
    '',
    ...items,
  ].join('\n');
}
