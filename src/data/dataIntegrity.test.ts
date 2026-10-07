import { describe, expect, it } from 'vitest';
import { allCountryIds, countries, countryById } from './countries';
import { relations } from './relations';
import { timelineItems } from './timelineItems';
import { layers } from './layers';
import { buildDataQualityReport } from '../lib/dataQuality';
import { hasVerifiedSources, isRelationVerified } from '../lib/provenance';
import type { SourceLink, TimelineItem } from '../types';
import { stories } from './stories';
import { contentManifest, withContent } from './content';
import { referenceItems } from './items/reference';

const sourceKinds = new Set<SourceLink['kind']>(['archive', 'academic', 'institution', 'encyclopedia', 'reference']);

function expectSourceShape(sources: SourceLink[] | undefined) {
  for (const source of sources ?? []) {
    expect(source.label.trim().length).toBeGreaterThan(1);
    expect(sourceKinds.has(source.kind)).toBe(true);
    const url = source.url;
    if (url) expect(() => new URL(url)).not.toThrow();
  }
}

function expectValidSources(sources: SourceLink[] | undefined) {
  expect(hasVerifiedSources(sources)).toBe(true);
  expectSourceShape(sources);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function expectValidItem(item: TimelineItem) {
  expect(item.id.trim()).not.toBe('');
  expect(allCountryIds).toContain(item.country);
  expect(Number.isInteger(item.year)).toBe(true);
  expect(item.year).not.toBe(0);
  expect(item.year).toBeGreaterThanOrEqual(-3_500_000);
  // Верхняя граница ловит ошибки разбора римских цифр при импорте:
  // «XI в.» прочитанное как «XL в.» даёт объект, датированный 3901 годом.
  expect(item.year, item.id).toBeLessThanOrEqual(new Date().getFullYear());
  // Обратная ошибка того же импорта: «18 января 1871 г.» разобрано так, что
  // год стал единицей, а «187» осталось в подписи. Подпись с трёх-четырёхзначным
  // числом не может принадлежать объекту первого века.
  if (item.dateLabel && /\d{3}/.test(item.dateLabel)) {
    expect(Math.abs(item.year), `${item.id}: ${item.dateLabel}`).toBeGreaterThanOrEqual(100);
  }
  // Третья ошибка того же импорта: «V – III вв. до н. э.» распозналось как
  // «V – ILL вв.» и дало −9900 год. Римские цифры в подписи должны быть
  // настоящими римскими цифрами.
  for (const token of item.dateLabel?.match(/\b[IVXLCDM]{1,7}\b/g) ?? []) {
    expect(
      /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(token),
      `${item.id}: «${token}» в подписи «${item.dateLabel}»`,
    ).toBe(true);
  }
  if (item.month !== undefined) expect(item.month).toBeGreaterThanOrEqual(1);
  if (item.month !== undefined) expect(item.month).toBeLessThanOrEqual(12);
  if (item.day !== undefined) {
    expect(item.month, `${item.id}: day requires month`).toBeDefined();
    expect(item.day).toBeGreaterThanOrEqual(1);
    expect(item.day).toBeLessThanOrEqual(daysInMonth(item.year, item.month!));
  }
  if (item.endYear !== undefined) expect(item.endYear, item.id).toBeGreaterThanOrEqual(item.year);
  expect(item.title.trim().length).toBeGreaterThan(1);
  expect(item.summary.trim().length).toBeGreaterThan(1);
  expect(item.detail.trim().length).toBeGreaterThan(1);
  if (item.verification === 'reference') {
    expect(item.sources?.length, `${item.id}: reference source`).toBeGreaterThan(0);
    expect(item.sources?.some((source) => source.kind === 'reference')).toBe(true);
    expectSourceShape(item.sources);
    expect(item.referencePage).toBeGreaterThanOrEqual(1);
  } else {
    expectValidSources(item.sources);
  }

  expect(new Set((item.viewpoints ?? []).map((viewpoint) => viewpoint.id)).size).toBe(item.viewpoints?.length ?? 0);
  for (const viewpoint of item.viewpoints ?? []) {
    expect(viewpoint.label.trim().length, viewpoint.id).toBeGreaterThan(1);
    expect(viewpoint.text.trim().length, viewpoint.id).toBeGreaterThan(20);
    expect(viewpoint.sources.length, viewpoint.id).toBeGreaterThan(0);
    expectSourceShape(viewpoint.sources);
  }
}

describe('historical data integrity', () => {
  const layerItems = layers.flatMap((layer) =>
    layer.items.map((item) => ({ ...item, country: 'germany' as const, layerId: layer.id })),
  );
  const allItems = [...timelineItems, ...layerItems];
  // Шкала знает только сводку редакционной базы; проверяются полные данные.
  const fullItems = allItems.map(withContent);
  const ids = allItems.map((item) => item.id);
  const baseIds = new Set(timelineItems.map((item) => item.id));

  it('keeps the data-driven country catalog unique and searchable', () => {
    expect(new Set(allCountryIds).size).toBe(allCountryIds.length);
    expect(Object.keys(countryById).length).toBe(countries.length);
    for (const country of countries) {
      expect(country.label.trim().length, country.id).toBeGreaterThan(1);
      expect(country.short.trim().length, country.id).toBeGreaterThan(0);
      expect(country.kind, country.id).toBeDefined();
      expect(country.region, country.id).toBeDefined();
      expect(countryById[country.id], country.id).toBe(country);
    }
  });

  it('has globally unique item and relation identifiers', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(relations.map((relation) => relation.id)).size).toBe(relations.length);
  });

  it('keeps exactly one correctly named content file for every item', () => {
    const contentIds = contentManifest.map((entry) => entry.id);

    expect(new Set(contentIds).size).toBe(contentIds.length);
    expect(new Set(contentIds)).toEqual(new Set(ids));
    for (const entry of contentManifest) {
      expect(entry.declaredId, `${entry.path}: missing front-matter id`).toBe(entry.filenameId);
    }
  });

  it('lets a rewritten handbook record replace its reference entry under the same id', () => {
    const referenceIds = new Set(referenceItems.map((item) => item.id));
    const promoted = fullItems.filter((item) => referenceIds.has(item.id) && item.verification !== 'reference');
    for (const item of promoted) {
      // Выверенная карточка — уже не запись справочника: свои источники, без страницы книги.
      expect(item.referencePage, item.id).toBeUndefined();
      expectValidSources(item.sources);
    }
    // Каждая карточка с id справочника действительно заменяет его запись, а не висит отдельно.
    for (const item of fullItems.filter((entry) => entry.id.startsWith('ref-'))) {
      expect(referenceIds.has(item.id), `${item.id}: нет такой записи в reference.json`).toBe(true);
    }
  });

  it('keeps item fields and dates inside the domain contract', () => {
    fullItems.forEach(expectValidItem);
  });

  it('keeps the content summary in step with the full content', () => {
    allItems.forEach((item, index) => {
      const full = fullItems[index];
      expect(Boolean(item.content?.article), item.id).toBe(Boolean(full.body));
      expect(Boolean(item.content?.verified), item.id).toBe(hasVerifiedSources(full.sources));
      expect(item.content?.viewpoints ?? 0, item.id).toBe(full.viewpoints?.length ?? 0);
      // Шкала не должна тянуть тексты: они грузятся вместе с модальным окном.
      expect(item.body ?? item.sources ?? item.viewpoints, item.id).toBeUndefined();
    });
  });

  it('does not leave dangling relation endpoints', () => {
    for (const relation of relations) {
      expect(baseIds.has(relation.from), `${relation.id}: missing from`).toBe(true);
      expect(baseIds.has(relation.to), `${relation.id}: missing to`).toBe(true);
      expect(relation.label.trim().length).toBeGreaterThan(3);
      expect(relation.detail.trim().length).toBeGreaterThan(20);
      expect(relation.from, relation.id).not.toBe(relation.to);
      expectSourceShape(relation.sources);
    }
  });

  it('never marks a relation verified without the required evidence', () => {
    for (const relation of relations.filter((item) => item.verification === 'verified')) {
      expect(isRelationVerified(relation), relation.id).toBe(true);
      expectValidSources(relation.sources);
    }
  });

  it('publishes a measurable provenance baseline', () => {
    const report = buildDataQualityReport(timelineItems, relations);
    expect(report.items.total).toBe(timelineItems.length);
    expect(report.items.verified).toBeGreaterThan(0);
    expect(report.relations.draft + report.relations.verified).toBe(relations.length);
    console.info('Data quality:', JSON.stringify(report));
  });

  it('keeps every guided story complete and free of dangling steps', () => {
    for (const story of stories) {
      expect(story.steps.length, story.id).toBeGreaterThanOrEqual(8);
      expect(story.steps.length, story.id).toBeLessThanOrEqual(15);
      expect(new Set(story.steps.map((step) => step.itemId)).size, story.id).toBe(story.steps.length);
      for (const step of story.steps) {
        expect(baseIds.has(step.itemId), `${story.id}: ${step.itemId}`).toBe(true);
        expect(step.title.trim().length, `${story.id}: ${step.itemId}`).toBeGreaterThan(3);
        expect(step.note.trim().length, `${story.id}: ${step.itemId}`).toBeGreaterThan(20);
      }
    }
  });
});
