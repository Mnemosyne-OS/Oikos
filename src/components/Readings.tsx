/**
 * Readings — what the house is reporting right now.
 *
 * Grouped by domain rather than listed, because a house is rooms of things and
 * a flat list of ninety entity ids is a database dump. A device that is not
 * answering keeps its tile and shows an em dash: hiding it would quietly shrink
 * the house every time a battery died.
 */
import { byDomain, displayReading, type Entity } from '../lib/homeAssistant';
import * as s from '../styles';

const DOMAIN_NAMES: Record<string, string> = {
  sensor: 'Sensors',
  binary_sensor: 'Open, closed, moving',
  device_tracker: 'Who is home',
  person: 'People',
  weather: 'Weather',
  sun: 'Sun',
};

export default function Readings({ entities }: { entities: readonly Entity[] }): JSX.Element {
  if (entities.length === 0) {
    return (
      <p style={s.lede}>
        Home Assistant answered, and reports no entities Oikos can read. That is its
        answer, not a failure to reach it.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {byDomain(entities).map(({ domain, entities: list }) => (
        <section key={domain} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={s.groupLabel}>
            {DOMAIN_NAMES[domain] ?? domain.replace(/_/g, ' ')} · {list.length}
          </p>
          <div style={s.grid}>
            {list.map(e => (
              <div key={e.entityId} style={s.tile} title={e.entityId}>
                <span style={e.unreadable ? s.readingAbsent : s.reading}>
                  {displayReading(e)}
                </span>
                <span style={s.tileName}>{e.name}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
