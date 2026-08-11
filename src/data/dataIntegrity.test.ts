import { describe, expect, it } from 'vitest';
import { allCountryIds } from './countries';
import { relations } from './relations';
import { timelineItems } from './timelineItems';
import { layers } from './layers';
import { buildDataQualityReport } from '../lib/dataQuality';
import { hasVerifiedSources, isRelationVerified } from '../lib/provenance';
import type { SourceLink, TimelineItem } from '../types';
import { stories } from './stories';

function expectValidSources(sources: SourceLink[] | undefined) {
  expect(hasVerifiedSources(sources)).toBe(true);
  for (const source of sources ?? []) {
    expect(source.label.trim().length).toBeGreaterThan(1);
    const url = source.url;
    if (url) expect(() => new URL(url)).not.toThrow();
  }
}

function expectValidItem(item: TimelineItem) {
  expect(item.id.trim()).not.toBe('');
  expect(allCountryIds).toContain(item.country);
  expect(Number.isInteger(item.year)).toBe(true);
  expect(item.year).toBeGreaterThanOrEqual(1);
  if (item.month !== undefined) expect(item.month).toBeGreaterThanOrEqual(1);
  if (item.month !== undefined) expect(item.month).toBeLessThanOrEqual(12);
  if (item.day !== undefined) expect(item.day).toBeGreaterThanOrEqual(1);
  if (item.day !== undefined) expect(item.day).toBeLessThanOrEqual(31);
  expect(item.title.trim().length).toBeGreaterThan(1);
  expect(item.summary.trim().length).toBeGreaterThan(1);
  expect(item.detail.trim().length).toBeGreaterThan(1);
  if (item.sources) expectValidSources(item.sources);
}

describe('historical data integrity', () => {
  const layerItems = layers.flatMap((layer) =>
    layer.items.map((item) => ({ ...item, country: 'germany' as const, layerId: layer.id })),
  );
  const allItems = [...timelineItems, ...layerItems];
  const ids = allItems.map((item) => item.id);
  const baseIds = new Set(timelineItems.map((item) => item.id));

  it('has globally unique item and relation identifiers', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(relations.map((relation) => relation.id)).size).toBe(relations.length);
  });

  it('keeps item fields and dates inside the domain contract', () => {
    allItems.forEach(expectValidItem);
  });

  it('does not leave dangling relation endpoints', () => {
    for (const relation of relations) {
      expect(baseIds.has(relation.from), `${relation.id}: missing from`).toBe(true);
      expect(baseIds.has(relation.to), `${relation.id}: missing to`).toBe(true);
      expect(relation.label.trim().length).toBeGreaterThan(3);
      expect(relation.detail.trim().length).toBeGreaterThan(20);
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
      for (const step of story.steps) expect(baseIds.has(step.itemId), `${story.id}: ${step.itemId}`).toBe(true);
    }
  });
});
