/**
 * homeAssistant.ts — reading what Home Assistant already knows.
 *
 * Oikos writes no device drivers. Home Assistant speaks to a thousand brands
 * already, and `/api/states` hands over every one of them in a single array, so
 * the whole integration is one endpoint and the parsing below. Writing our own
 * Zigbee stack would be twenty years of someone else's work, redone worse.
 *
 * Everything here is pure. The network lives in Mnemosyne OS, and the
 * decisions worth getting right — what counts as a reading, what is unavailable,
 * what a sensor is even called — are decisions, not I/O.
 */

/** One row of `/api/states`, reduced to what a dashboard can honestly show. */
export interface Entity {
  entityId: string;
  /** Left half of the id: sensor, binary_sensor, light, camera… */
  domain: string;
  /** The reading exactly as HA wrote it. */
  state: string;
  /** Parsed only when it really is a number. Absent is NOT zero. */
  value?: number;
  unit?: string;
  name: string;
  /**
   * HA's own two words for "I have no reading": `unavailable` (the device is
   * not answering) and `unknown` (it is, but has nothing to say yet). Both are
   * kept as-is and flagged, never rendered as a value and never as 0 — a
   * thermostat that has dropped off the network is not a room at zero degrees.
   */
  unreadable: boolean;
}

const NO_READING = new Set(['unavailable', 'unknown', 'none', '']);

/** HA marks these read-only-by-nature; everything else could be actuated (which Oikos never does). */
const SENSOR_DOMAINS = new Set(['sensor', 'binary_sensor', 'device_tracker', 'weather', 'sun', 'person']);

interface RawState {
  entity_id?: unknown;
  state?: unknown;
  attributes?: { friendly_name?: unknown; unit_of_measurement?: unknown } | null;
}

/**
 * Turn a `/api/states` body into entities.
 *
 * Returns `null` — not `[]` — when the body is not what we asked for. An empty
 * array means "your Home Assistant reports no entities", which is a real and
 * very different statement from "we could not read the answer"; collapsing the
 * two is how a broken connection comes to look like an empty house.
 */
export function parseStates(body: string): Entity[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { return null; }
  if (!Array.isArray(parsed)) return null;

  const out: Entity[] = [];
  for (const raw of parsed as RawState[]) {
    const entityId = typeof raw?.entity_id === 'string' ? raw.entity_id : '';
    if (!entityId.includes('.')) continue;
    // Only a string or a number is a reading. An object here would stringify
    // to "[object Object]" and be shown as though the sensor said it, which is
    // a fabricated reading with a straight face.
    const rawState = raw?.state;
    const state = typeof rawState === 'string' ? rawState
      : typeof rawState === 'number' && Number.isFinite(rawState) ? String(rawState)
      : '';
    const attrs = raw?.attributes ?? {};
    const name = typeof attrs?.friendly_name === 'string' && attrs.friendly_name
      ? attrs.friendly_name
      : entityId.split('.')[1]?.replace(/_/g, ' ') ?? entityId;
    const unit = typeof attrs?.unit_of_measurement === 'string' ? attrs.unit_of_measurement : undefined;
    const unreadable = NO_READING.has(state.trim().toLowerCase());
    // Number() on '' is 0 and on null is 0. Both would be a fabricated reading,
    // so the guard is the emptiness check, not just Number.isFinite.
    const n = !unreadable && state.trim() !== '' ? Number(state) : NaN;

    out.push({
      entityId,
      domain: entityId.split('.')[0] ?? '',
      state,
      ...(Number.isFinite(n) ? { value: n } : {}),
      ...(unit ? { unit } : {}),
      name,
      unreadable,
    });
  }
  return out;
}

/** Things that only report. Oikos shows these first because they are all it can honestly offer. */
export function sensorsOf(entities: readonly Entity[]): Entity[] {
  return entities.filter(e => SENSOR_DOMAINS.has(e.domain));
}

/** Group for display, biggest group first, so a house reads as rooms of things rather than a list of ids. */
export function byDomain(entities: readonly Entity[]): Array<{ domain: string; entities: Entity[] }> {
  const groups = new Map<string, Entity[]>();
  for (const e of entities) {
    const g = groups.get(e.domain);
    if (g) g.push(e); else groups.set(e.domain, [e]);
  }
  return [...groups.entries()]
    .map(([domain, list]) => ({ domain, entities: list }))
    .sort((a, b) => b.entities.length - a.entities.length || a.domain.localeCompare(b.domain));
}

/** What a tile shows. Never invents a number for a device that is not answering. */
export function displayReading(e: Entity): string {
  if (e.unreadable) return '—';
  return e.unit ? `${e.state} ${e.unit}` : e.state;
}

/**
 * The declarative watch target for a set of entities.
 *
 * One target for the WHOLE box rather than one per entity: `/api/states`
 * answers for everything at once, so twelve sensors would otherwise burn twelve
 * of the twelve allowed targets to fetch the same body twelve times.
 *
 * `step` is the caller's, because the right coarseness is a property of what is
 * being measured: half a degree on a thermometer is a change worth hearing
 * about, half a percent of humidity is noise that would fill the watch's memory
 * with its own jitter.
 */
export function watchTargetFor(baseUrl: string, step?: number): {
  url: string; lan: true; label: string;
  spec: { mode: 'value'; idField: string; valueField: string; labelField: string; unitField: string; step?: number };
} {
  return {
    url: `${baseUrl}/api/states`,
    lan: true,
    label: 'Home Assistant',
    spec: {
      mode: 'value',
      idField: 'entity_id',
      valueField: 'state',
      labelField: 'attributes.friendly_name',
      unitField: 'attributes.unit_of_measurement',
      ...(step && step > 0 ? { step } : {}),
    },
  };
}
