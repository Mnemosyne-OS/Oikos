/**
 * Reading Home Assistant honestly.
 *
 * The theme running through these: a device that is not answering must never
 * come out the other side as a number. HA says `unavailable` and `unknown` all
 * day long, and `Number('')` is 0.
 */
import { describe, expect, it } from 'vitest';
import { byDomain, displayReading, parseStates, sensorsOf, watchTargetFor } from './homeAssistant';

const BODY = JSON.stringify([
  { entity_id: 'sensor.salon_temp', state: '21.4', attributes: { friendly_name: 'Salon', unit_of_measurement: '°C' } },
  { entity_id: 'binary_sensor.portail', state: 'on', attributes: { friendly_name: 'Portail' } },
  { entity_id: 'sensor.humidite', state: 'unavailable', attributes: { friendly_name: 'Humidité', unit_of_measurement: '%' } },
  { entity_id: 'light.cuisine', state: 'off', attributes: { friendly_name: 'Cuisine' } },
]);

describe('parseStates', () => {
  it('reads a state row into a reading, a unit and a name', () => {
    const salon = parseStates(BODY)?.[0];
    expect(salon).toEqual({
      entityId: 'sensor.salon_temp', domain: 'sensor', state: '21.4',
      value: 21.4, unit: '°C', name: 'Salon', unreadable: false,
    });
  });

  it('marks unavailable as unreadable and gives it NO value', () => {
    const hum = parseStates(BODY)?.find(e => e.entityId === 'sensor.humidite');
    expect(hum?.unreadable).toBe(true);
    expect(hum).not.toHaveProperty('value');
  });

  it.each(['unavailable', 'unknown', 'none', ''])('treats %s as no reading, never as 0', state => {
    const [e] = parseStates(JSON.stringify([{ entity_id: 'sensor.x', state }])) ?? [];
    expect(e?.unreadable).toBe(true);
    expect(e?.value).toBeUndefined();
  });

  it('leaves value undefined for a state that is words', () => {
    const portail = parseStates(BODY)?.find(e => e.entityId === 'binary_sensor.portail');
    expect(portail?.state).toBe('on');
    expect(portail).not.toHaveProperty('value');
    expect(portail?.unreadable).toBe(false); // "on" IS a reading
  });

  it('returns null for a body that is not the states array, never an empty list', () => {
    // [] means "your HA reports nothing". null means "we could not read the
    // answer". A dashboard that shows the same empty house for both is lying
    // about one of them.
    expect(parseStates('<html>login</html>')).toBeNull();
    expect(parseStates('{"message":"Unauthorized"}')).toBeNull();
    expect(parseStates('[]')).toEqual([]);
  });

  it('falls back to the id when a row carries no friendly name', () => {
    const [e] = parseStates(JSON.stringify([{ entity_id: 'sensor.back_door_battery', state: '90' }])) ?? [];
    expect(e?.name).toBe('back door battery');
  });

  it('skips a row with no usable entity id rather than inventing one', () => {
    const out = parseStates(JSON.stringify([{ state: '1' }, { entity_id: 'nodot', state: '1' }, { entity_id: 'sensor.ok', state: '1' }]));
    expect(out?.map(e => e.entityId)).toEqual(['sensor.ok']);
  });
});

describe('what Oikos offers', () => {
  it('keeps only the domains that report, since reading is all it can do', () => {
    const ids = sensorsOf(parseStates(BODY) ?? []).map(e => e.entityId);
    expect(ids).toContain('sensor.salon_temp');
    expect(ids).toContain('binary_sensor.portail');
    // A light can be switched, and Oikos cannot switch it — offering the tile
    // would promise a button that does not exist.
    expect(ids).not.toContain('light.cuisine');
  });

  it('groups by domain, biggest group first', () => {
    const groups = byDomain(parseStates(BODY) ?? []);
    expect(groups[0]?.domain).toBe('sensor');
    expect(groups[0]?.entities).toHaveLength(2);
  });
});

describe('displayReading', () => {
  it('shows the reading with its unit', () => {
    const [salon] = parseStates(BODY) ?? [];
    expect(displayReading(salon!)).toBe('21.4 °C');
  });

  it('shows an em dash for a device that is not answering, never a number', () => {
    const hum = parseStates(BODY)!.find(e => e.entityId === 'sensor.humidite')!;
    expect(displayReading(hum)).toBe('—');
    expect(displayReading(hum)).not.toContain('0');
  });
});

describe('watchTargetFor', () => {
  it('is ONE target for the whole box, not one per sensor', () => {
    // /api/states answers for everything at once; twelve targets would fetch
    // the same body twelve times and spend the whole per-cartridge budget.
    const t = watchTargetFor('http://192.168.1.8:8123');
    expect(t.url).toBe('http://192.168.1.8:8123/api/states');
    expect(t.lan).toBe(true);
    expect(t.spec.mode).toBe('value');
  });

  it('names the fields the host extractor needs, so a reading survives the trip', () => {
    const { spec } = watchTargetFor('http://x:8123');
    expect(spec).toMatchObject({
      idField: 'entity_id', valueField: 'state',
      labelField: 'attributes.friendly_name', unitField: 'attributes.unit_of_measurement',
    });
  });

  it('passes a step through, and drops a meaningless one', () => {
    expect(watchTargetFor('http://x', 0.5).spec.step).toBe(0.5);
    expect(watchTargetFor('http://x', 0).spec).not.toHaveProperty('step');
    expect(watchTargetFor('http://x').spec).not.toHaveProperty('step');
  });
});
