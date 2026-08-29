/**
 * What a tile is allowed to say.
 *
 * The failure this guards against is quiet and plausible: a dead battery
 * rendering as a room at zero degrees, or the sensor disappearing so the house
 * silently shrinks. Both look fine on screen, which is exactly why they need a
 * test rather than a reading.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Readings from './Readings';
import { parseStates, sensorsOf } from '../lib/homeAssistant';

const entities = sensorsOf(parseStates(JSON.stringify([
  { entity_id: 'sensor.salon', state: '21.4', attributes: { friendly_name: 'Salon', unit_of_measurement: '°C' } },
  { entity_id: 'sensor.humidite', state: 'unavailable', attributes: { friendly_name: 'Humidité', unit_of_measurement: '%' } },
  { entity_id: 'binary_sensor.portail', state: 'on', attributes: { friendly_name: 'Portail' } },
])) ?? []);

describe('Readings', () => {
  it('shows a reading with its unit', () => {
    render(<Readings entities={entities} />);
    expect(screen.getByText('21.4 °C')).toBeInTheDocument();
  });

  it('shows an em dash for a device that is not answering, and no zero', () => {
    render(<Readings entities={entities} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0 %')).not.toBeInTheDocument();
    expect(screen.queryByText(/^0/)).not.toBeInTheDocument();
  });

  it('KEEPS the unreadable device on screen rather than shrinking the house', () => {
    render(<Readings entities={entities} />);
    expect(screen.getByText('Humidité')).toBeInTheDocument();
  });

  it('groups by domain instead of listing raw ids', () => {
    render(<Readings entities={entities} />);
    expect(screen.getByText(/Sensors · 2/)).toBeInTheDocument();
    expect(screen.getByText(/Open, closed, moving · 1/)).toBeInTheDocument();
  });

  it('says an empty answer came FROM the box, not that it failed to reach it', () => {
    render(<Readings entities={[]} />);
    expect(screen.getByText(/answered/i)).toBeInTheDocument();
    expect(screen.getByText(/not a failure to reach it/i)).toBeInTheDocument();
  });
});
