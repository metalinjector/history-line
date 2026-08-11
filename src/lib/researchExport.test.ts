import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '../types';
import { buildResearchSession, researchSessionToMarkdown } from './researchExport';

describe('research export', () => {
  it('exports filters, notes and sources to stable JSON and Markdown', () => {
    const item: TimelineItem = {
      id: 'event', country: 'russia', year: 1917, kind: 'event', title: 'Революция',
      summary: 'Кратко', detail: 'Подробно', tags: ['политика'],
      sources: [{ label: 'Архив', url: 'https://example.test/archive', kind: 'archive' }],
    };
    const session = buildResearchSession([item], { event: 'Сравнить с 1918' }, {
      countries: ['russia'], kind: 'events', query: '', keyOnly: false,
      tags: ['политика'], zoom: 1, layers: [], columnGroups: [],
    }, '2026-01-01T00:00:00.000Z');
    const markdown = researchSessionToMarkdown(session);

    expect(session.schema).toBe('history-line/research-session@1');
    expect(session.items[0].note).toBe('Сравнить с 1918');
    expect(markdown).toContain('# Исследовательская сессия History Line');
    expect(markdown).toContain('> Личная заметка: Сравнить с 1918');
    expect(markdown).toContain('https://example.test/archive');
  });
});
