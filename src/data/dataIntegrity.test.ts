import { describe, expect, it } from 'vitest';
import { allCountryIds, countries, countryById } from './countries';
import { relations } from './relations';
import { timelineItems } from './timelineItems';
import { layers } from './layers';
import { buildDataQualityReport } from '../lib/dataQuality';
import { hasVerifiedSources, isRelationVerified } from '../lib/provenance';
import type { SourceLink, TimelineItem } from '../types';
import { stories } from './stories';
import { contentManifest } from './content';
import referenceCountryOverrides from '../../scripts/reference_country_overrides.json';

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
  const ids = allItems.map((item) => item.id);
  const baseIds = new Set(timelineItems.map((item) => item.id));
  const itemById = new Map(timelineItems.map((item) => [item.id, item]));

  it('keeps the data-driven country catalog unique and searchable', () => {
    expect(new Set(allCountryIds).size).toBe(allCountryIds.length);
    expect(Object.keys(countryById).length).toBe(countries.length);
    for (const country of countries) {
      expect(country.label.trim().length, country.id).toBeGreaterThan(1);
      expect(country.short.trim().length, country.id).toBeGreaterThan(0);
      expect(country.kind, country.id).toBeDefined();
      expect(country.region, country.id).toBeDefined();
      expect(countryById[country.id], country.id).toBe(country);
      if (country.kind === 'historical') {
        expect(country.lineSpan, `${country.id}: historical line span`).toBeDefined();
        expect(Number.isInteger(country.lineSpan?.from), country.id).toBe(true);
        expect(Number.isInteger(country.lineSpan?.to), country.id).toBe(true);
        expect(country.lineSpan?.from, country.id).not.toBe(0);
        expect(country.lineSpan?.to, country.id).not.toBe(0);
        expect(country.lineSpan!.from, country.id).toBeLessThanOrEqual(country.lineSpan!.to);
        expect(country.lineSpan!.to, country.id).toBeLessThan(new Date().getFullYear());
        expect(country.lineSpan!.sources.length, `${country.id}: line-span sources`).toBeGreaterThan(0);
        expectSourceShape(country.lineSpan!.sources);
        expect(
          country.lineSpan!.sources.some(
            (source) =>
              Boolean(source.url) &&
              (source.kind === 'institution' || source.kind === 'academic' || source.kind === 'archive'),
          ),
          `${country.id}: line span needs an authoritative linked source`,
        ).toBe(true);
      } else {
        expect(country.lineSpan, `${country.id}: only historical lines are bounded`).toBeUndefined();
      }
    }
  });

  it('keeps every historical object inside the lifespan of its named line', () => {
    for (const item of timelineItems) {
      const lineSpan = countryById[item.country]?.lineSpan;
      if (!lineSpan) continue;
      expect(item.year, `${item.id}: before ${item.country} starts`).toBeGreaterThanOrEqual(lineSpan.from);
      expect(item.endYear ?? item.year, `${item.id}: after ${item.country} ends`).toBeLessThanOrEqual(lineSpan.to);
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

  it('keeps item fields and dates inside the domain contract', () => {
    allItems.forEach(expectValidItem);
  });

  it('keeps every manually audited reference attribution', () => {
    for (const [id, country] of Object.entries(referenceCountryOverrides)) {
      expect(itemById.get(id), `${id}: missing audited reference item`).toBeDefined();
      expect(itemById.get(id)?.country, id).toBe(country);
    }
  });

  it('keeps the international fallback tag consistent with reference attribution', () => {
    for (const item of timelineItems.filter((candidate) => candidate.verification === 'reference')) {
      if (item.country === 'world') {
        expect(
          item.tags.includes('всемирная история') || item.tags.includes('международные отношения'),
          item.id,
        ).toBe(true);
      } else {
        expect(item.tags, item.id).not.toContain('всемирная история');
      }
    }
  });

  it('attributes the imperial history of 962–1806 to the Holy Roman Empire', () => {
    const imperialItems = [
      'de-hre-962',
      'de-worms-1122',
      'de-barbarossa-1152',
      'de-golden-bull-1356',
      'de-augsburg-1555',
      'de-thirty-years-1618',
      'de-westphalia-1648',
      'de-hre-end-1806',
    ];
    for (const id of imperialItems) {
      expect(itemById.get(id)?.country, id).toBe('holy-roman-empire');
    }
  });

  it('places qualified BCE millennia on the correct side of the millennium', () => {
    expect(itemById.get('ref-p009-vozniknovenie-goroda-gosudarstva-apipur')?.year).toBe(-2000);
    expect(itemById.get('ref-p011-vozniknovenie-plemennogo-soyuza-persov')?.year).toBe(-1000);
    expect(itemById.get('ref-p006-vozniknovenie-pervyh-gosudarstv-v-doline-n')?.year).toBe(-3100);
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
