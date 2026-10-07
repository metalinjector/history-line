import { describe, expect, it } from 'vitest';
import type { Relation, TimelineItem } from '../types';
import { buildCustomExport, CUSTOM_SCHEMA, parseCustomImport, relationIsComplete } from './customObjects';

const person: TimelineItem = {
  id: 'custom-germany-1543-abc123',
  country: 'germany',
  year: 1543,
  kind: 'person',
  title: 'Николай Коперник',
  summary: 'Публикует «О вращении небесных сфер».',
  detail: 'Гелиоцентрическая система.',
  life: '1473–1543',
  tags: ['наука'],
  importance: 2,
  custom: true,
};

const sources = [
  { label: 'Stanford Encyclopedia of Philosophy', url: 'https://plato.stanford.edu/entries/copernicus/', kind: 'academic' as const },
  { label: 'Britannica', url: 'https://www.britannica.com/biography/Nicolaus-Copernicus', kind: 'encyclopedia' as const },
];

const relation: Relation = {
  id: `${person.id}-rel-0`,
  from: person.id,
  to: 'de-luther-1517',
  kind: 'context',
  label: 'Коперник и Реформация',
  detail: 'Обе перемены подрывают авторитет прежней картины мира в одни десятилетия.',
  sources,
  verification: 'verified',
};

const context = () => ({ knownIds: new Set(['de-luther-1517']), customIds: new Set<string>(), currentYear: 2026 });
const file = (data: object) => JSON.stringify({ schema: CUSTOM_SCHEMA, exportedAt: '2026-10-07', ...data });

describe('custom objects export and import', () => {
  it('round-trips items with their relations', () => {
    const exported = buildCustomExport([person], [relation, { ...relation, id: 'other', from: 'someone-else' }]);
    expect(exported.relations).toHaveLength(1);

    const imported = parseCustomImport(JSON.stringify(exported), context());
    expect(imported.skipped).toEqual([]);
    expect(imported.items).toEqual([person]);
    expect(imported.relations).toEqual([relation]);
  });

  it('does not duplicate objects that are already on the timeline', () => {
    const imported = parseCustomImport(JSON.stringify(buildCustomExport([person], [relation])), {
      ...context(),
      customIds: new Set([person.id]),
    });
    expect(imported.duplicates).toBe(1);
    expect(imported.items).toEqual([]);
    expect(imported.relations).toEqual([]);
  });

  it('gives a fresh id to objects that clash with the base and keeps their relations', () => {
    const clashing = { ...person, id: 'de-luther-1517' };
    const imported = parseCustomImport(
      file({ items: [clashing], relations: [{ ...relation, from: 'de-luther-1517', to: 'de-luther-1517' }] }),
      context(),
    );
    const [item] = imported.items;
    expect(item.id).toMatch(/^custom-germany-1543-/);
    expect(imported.relations[0]).toMatchObject({ from: item.id, to: item.id });
  });

  it('drops unknown fields and reports what it could not accept', () => {
    const imported = parseCustomImport(
      file({
        items: [
          { ...person, id: 'custom-a', verification: 'verified', content: { verified: true }, extra: 1 },
          { ...person, id: 'custom-b', country: 'atlantis' },
          { ...person, id: 'custom-c', year: 0 },
          { ...person, id: 'custom-d', endYear: 1500 },
          { ...person, id: 'custom-e', title: '' },
        ],
        relations: [
          { ...relation, from: 'custom-a', sources: [sources[1]] },
          { ...relation, from: 'custom-a', to: 'nowhere' },
        ],
      }),
      context(),
    );

    expect(imported.items.map((item) => item.id)).toEqual(['custom-a']);
    expect(imported.items[0]).not.toHaveProperty('verification');
    expect(imported.items[0]).not.toHaveProperty('content');
    expect(imported.items[0]).not.toHaveProperty('extra');
    expect(imported.relations).toEqual([]);
    expect(imported.skipped).toEqual([
      'Объект «Николай Коперник»: нет линии «atlantis».',
      'Объект «Николай Коперник»: год вне шкалы.',
      'Объект «Николай Коперник»: год окончания раньше начала или вне шкалы.',
      'Объект № 5: нет заголовка.',
      'Связь «Коперник и Реформация»: нужны объяснение от 20 знаков и два источника со ссылками, хотя бы один — не энциклопедия.',
      'Связь «Коперник и Реформация»: не найден один из её объектов.',
    ]);
  });

  it('rejects files that are not exports', () => {
    expect(parseCustomImport('{', context()).skipped).toEqual(['Файл не читается как JSON.']);
    expect(parseCustomImport('{"items": []}', context()).skipped).toEqual(['Это не файл своих объектов History Line.']);
  });

  it('requires two linked sources, one of them not an encyclopedia', () => {
    expect(relationIsComplete(relation)).toBe(true);
    expect(relationIsComplete({ ...relation, sources: [sources[1], sources[1]] })).toBe(false);
    expect(relationIsComplete({ ...relation, sources: [sources[0], { ...sources[1], url: 'ftp://x' }] })).toBe(false);
    expect(relationIsComplete({ ...relation, detail: 'коротко' })).toBe(false);
  });
});
