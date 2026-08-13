import { describe, expect, it } from 'vitest';
import { countries, countryById } from './countries';
import { buildColumns, effectiveCountryIds, impliedAncestors } from './columns';

describe('линии-предшественники', () => {
  it('назначает каждой исторической линии одну колонку-хозяина без заявления о правопреемстве', () => {
    const host = new Map<string, string>();
    for (const country of countries) {
      for (const ancestor of country.ancestors ?? []) {
        expect(host.has(ancestor), `${ancestor}: наследники ${host.get(ancestor)} и ${country.id}`).toBe(
          false,
        );
        host.set(ancestor, country.id);
      }
    }
  });

  it('ссылается только на существующие исторические линии', () => {
    for (const country of countries) {
      for (const ancestor of country.ancestors ?? []) {
        expect(countryById[ancestor], `${country.id} → ${ancestor}`).toBeDefined();
        expect(countryById[ancestor].kind, ancestor).toBe('historical');
      }
    }
  });

  it('отдаёт древнюю линию наследнику, пока она не выбрана сама', () => {
    expect(impliedAncestors(['italy']).get('ancient-rome')).toBe('italy');
    expect(effectiveCountryIds(['italy'])).toContain('ancient-rome');
  });

  it('не дублирует линию, выбранную отдельной колонкой', () => {
    expect(impliedAncestors(['italy', 'ancient-rome']).has('ancient-rome')).toBe(false);
    expect(effectiveCountryIds(['italy', 'ancient-rome']).filter((id) => id === 'ancient-rome')).toHaveLength(
      1,
    );
  });

  it('ставит унаследованную дорожку в колонку наследника и помечает её', () => {
    const [column] = buildColumns(['italy'], []);
    expect(column.tracks.map((track) => track.countryId)).toEqual(['italy', 'ancient-rome']);
    expect(column.tracks[0].inherited).toBeUndefined();
    expect(column.tracks[1].inherited).toBe(true);
    expect(column.shared).toBe(true);
  });

  it('возвращает древнюю линию в свою колонку, когда её выбрали явно', () => {
    const columns = buildColumns(['italy', 'ancient-rome'], []);
    const italy = columns.find((column) => column.id === 'italy')!;
    const rome = columns.find((column) => column.id === 'ancient-rome')!;
    expect(italy.tracks).toHaveLength(1);
    expect(rome.tracks).toHaveLength(1);
  });

  it('не отбрасывает исторический контекст из-за лимита ручного объединения', () => {
    const turkey = buildColumns(['turkey'], [])[0];
    expect(turkey.tracks.map((track) => track.countryId)).toEqual([
      'turkey',
      'hittites',
      'byzantium',
      'ottoman-empire',
    ]);

    const iraq = buildColumns(['iraq'], [])[0];
    expect(iraq.tracks.map((track) => track.countryId)).toEqual([
      'iraq',
      'mesopotamia',
      'assyria',
      'babylonia',
    ]);
  });
});
