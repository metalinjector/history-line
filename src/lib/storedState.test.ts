import { describe, expect, it } from 'vitest';
import {
  storedAxis,
  storedBoolean,
  storedColumnGroups,
  storedCountries,
  storedCountrySets,
  storedItems,
  storedLayerIds,
  storedLayerPlacements,
  storedNotes,
  storedRelations,
  storedTheme,
  storedZoom,
} from './storedState';
import { layers } from '../data/layers';
import { ZOOM_MAX } from './zoom';

const layerId = layers[0].id;

const item = {
  id: 'custom-germany-1543-abc123',
  country: 'germany',
  year: 1543,
  kind: 'person',
  title: 'Николай Коперник',
  summary: 'Публикует «О вращении небесных сфер».',
  tags: ['наука'],
  custom: true,
};

const relation = { id: 'r-1', from: item.id, to: 'de-luther-1517', kind: 'context', label: 'Коперник и Реформация' };

describe('проверка сохранённого в браузере', () => {
  it('годные значения проходят без изменений — тем же объектом', () => {
    const items = [item];
    const relations = [relation];
    const notes = { 'de-luther-1517': 'заметка' };
    expect(storedItems(items)).toBe(items);
    expect(storedRelations(relations)).toBe(relations);
    expect(storedNotes(notes)).toBe(notes);
    expect(storedCountries(['france', 'russia'])).toEqual(['france', 'russia']);
    expect(storedColumnGroups([['france', 'russia']])).toEqual([['france', 'russia']]);
    expect(storedLayerIds([layerId])).toEqual([layerId]);
    expect(storedLayerPlacements({ [layerId]: 'own' })).toEqual({ [layerId]: 'own' });
    expect(storedLayerPlacements({ [layerId]: 'france' })).toEqual({ [layerId]: 'france' });
    expect(storedCountrySets([{ id: 'user-1', label: 'Мой', countries: ['france'] }])).toEqual([
      { id: 'user-1', label: 'Мой', countries: ['france'] },
    ]);
    expect(storedTheme('atlas')).toBe('atlas');
    expect(storedAxis('horizontal')).toBe('horizontal');
    expect(storedZoom(1.3)).toBe(1.3);
    expect(storedBoolean(false)).toBe(false);
  });

  it('значение не той формы заменяется значением по умолчанию', () => {
    // undefined означает «взять значение по умолчанию» — см. usePersistentState.
    for (const junk of ['france', 42, null, { a: 1 }]) {
      expect(storedCountries(junk)).toBeUndefined();
      expect(storedItems(junk)).toBeUndefined();
      expect(storedRelations(junk)).toBeUndefined();
      expect(storedColumnGroups(junk)).toBeUndefined();
      expect(storedLayerIds(junk)).toBeUndefined();
      expect(storedCountrySets(junk)).toBeUndefined();
    }
    for (const junk of ['x', 42, null, ['a']]) {
      expect(storedNotes(junk)).toBeUndefined();
      expect(storedLayerPlacements(junk)).toBeUndefined();
    }
    expect(storedTheme('neon')).toBeUndefined();
    expect(storedAxis(42)).toBeUndefined();
    expect(storedZoom('abc')).toBeUndefined();
    expect(storedZoom(Number.NaN)).toBeUndefined();
    expect(storedBoolean('no')).toBeUndefined();
  });

  it('линии не из каталога отбрасываются, пустой выбор не принимается', () => {
    expect(storedCountries(['atlantis', 'france', 'france'])).toEqual(['france']);
    expect(storedCountries(['atlantis'])).toBeUndefined();
    expect(storedCountries([])).toBeUndefined();
    expect(storedColumnGroups([['atlantis', 'germany'], 'x', ['france', 'russia']])).toEqual([['france', 'russia']]);
    expect(storedLayerIds(['nope', layerId, layerId])).toEqual([layerId]);
    expect(storedLayerPlacements({ nope: 'own', [layerId]: 'atlantis' })).toEqual({});
    expect(storedCountrySets([{ id: 'u', label: 'L' }, { id: 'u2', label: 'L2', countries: ['atlantis'] }])).toEqual([]);
  });

  it('объект, который нельзя поставить на шкалу, не попадает в интерфейс', () => {
    const broken = [
      item,
      { id: 'x' },
      { ...item, id: 'custom-2', country: 'atlantis' },
      { ...item, id: 'custom-3', year: 0 },
      { ...item, id: 'custom-4', kind: 'rumour' },
      { ...item }, // повтор id
      null,
    ];
    expect(storedItems(broken)).toEqual([item]);
  });

  it('объекту без тегов и описания достраиваются пустые', () => {
    const { tags: _tags, summary: _summary, ...bare } = item;
    expect(storedItems([bare])).toEqual([{ ...bare, summary: '', tags: [] }]);
  });

  it('связь без концов или с неизвестным характером отбрасывается', () => {
    expect(storedRelations([relation, { id: 'r' }, { ...relation, id: 'r-2', kind: 'gossip' }])).toEqual([relation]);
  });

  it('в заметках остаются только строки, масштаб не выходит за пределы', () => {
    expect(storedNotes({ a: 'текст', b: 5, c: null })).toEqual({ a: 'текст' });
    expect(storedZoom(99)).toBe(ZOOM_MAX);
  });
});
