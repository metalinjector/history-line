import { describe, expect, it } from 'vitest';
import { workspaceSectionById, workspaceSections } from './workspaceSections';

describe('верхняя рабочая панель', () => {
  it('содержит все разделы, ранее располагавшиеся под хронологией', () => {
    expect(workspaceSections.map((section) => section.id)).toEqual([
      'routes',
      'research',
      'people',
      'editorial',
      'method',
    ]);
  });

  it('использует уникальные идентификаторы и непустые подписи', () => {
    expect(new Set(workspaceSections.map((section) => section.id)).size).toBe(workspaceSections.length);
    expect(workspaceSections.every((section) => section.label && section.description)).toBe(true);
  });

  it('индекс разделов соответствует каталогу', () => {
    for (const section of workspaceSections) {
      expect(workspaceSectionById[section.id]).toBe(section);
    }
  });
});
