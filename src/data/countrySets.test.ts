import { describe, expect, it } from 'vitest';
import { allCountryIds, countryById, defaultCountryIds } from './countries';
import { builtinCountrySets, normalizeSet, sameSet, suggestSetName } from './countrySets';

describe('country sets', () => {
  it('references only countries that exist in the catalog', () => {
    for (const set of builtinCountrySets) {
      expect(set.countries.length, set.id).toBeGreaterThan(0);
      for (const id of set.countries) {
        expect(allCountryIds, `${set.id} → ${id}`).toContain(id);
      }
    }
  });

  it('has unique ids and labels', () => {
    const ids = builtinCountrySets.map((set) => set.id);
    const labels = builtinCountrySets.map((set) => set.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('opens on the seven European lines', () => {
    expect(defaultCountryIds).toEqual([
      'england',
      'france',
      'germany',
      'italy',
      'spain',
      'russia',
      'belarus',
    ]);
    expect(builtinCountrySets[0].countries).toEqual(defaultCountryIds);
  });

  it('normalizes a set to catalog order without duplicates or unknown ids', () => {
    expect(normalizeSet(['russia', 'england', 'russia', 'atlantis'])).toEqual(['england', 'russia']);
  });

  it('compares sets by contents, not by order', () => {
    expect(sameSet(['france', 'spain'], ['spain', 'france'])).toBe(true);
    expect(sameSet(['france'], ['france', 'spain'])).toBe(false);
  });

  it('suggests a readable name from the first lines', () => {
    const labelOf = (id: string) => countryById[id]?.label ?? id;
    expect(suggestSetName(['france', 'spain'], labelOf)).toBe('Франция, Испания');
    expect(suggestSetName(defaultCountryIds, labelOf)).toBe('Великобритания, Франция, Германия +4');
  });
});
