/**
 * The background half, and the two sentences it must never get wrong: what an
 * older host is told, and how far the promise actually reaches.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WhileYouWereAway from './WhileYouWereAway';

const noop = (): void => {};
const base = {
  available: true, missing: [] as string[], watching: false,
  items: [], busy: false, onToggle: noop, onClear: noop,
};

describe('WhileYouWereAway', () => {
  it('NAMES what an older host is missing instead of hiding the feature', () => {
    // A capability rendered as nothing reads as a feature that does not exist,
    // and the user never learns an update would give it to them.
    render(<WhileYouWereAway {...base} available={false} missing={['watch.value']} />);
    expect(screen.getByText(/watch\.value/)).toBeInTheDocument();
    expect(screen.getByText(/Updating the app turns this on/i)).toBeInTheDocument();
  });

  it('still says the rest works, so a missing extra does not read as a broken app', () => {
    render(<WhileYouWereAway {...base} available={false} missing={['watch.background']} />);
    expect(screen.getByText(/Everything above still works/i)).toBeInTheDocument();
  });

  it('says out loud that watching stops when the app does', () => {
    // This is the one promise the feature cannot overstate: someone would rely
    // on it to watch their home.
    render(<WhileYouWereAway {...base} />);
    expect(screen.getByText(/only while Mnemosyne OS itself is open/i)).toBeInTheDocument();
  });

  it('explains silence as silence, not as a failure', () => {
    render(<WhileYouWereAway {...base} watching />);
    expect(screen.getByText(/Nothing has moved/i)).toBeInTheDocument();
    expect(screen.getByText(/first look never announces anything/i)).toBeInTheDocument();
  });

  it('renders a reading with its unit, without re-deriving it from an id', () => {
    render(<WhileYouWereAway {...base} watching items={[
      { id: 'sensor.salon=24.5', label: 'Salon', source: 'Home Assistant', at: 'now', state: '24.5', value: 24.5, unit: '°C' },
    ]} />);
    expect(screen.getByText('Salon')).toBeInTheDocument();
    expect(screen.getByText('24.5 °C')).toBeInTheDocument();
  });

  it('shows nothing rather than a blank value for a row carrying no reading', () => {
    render(<WhileYouWereAway {...base} watching items={[
      { id: 'something', label: 'A feed item', source: 'Home Assistant', at: 'now' },
    ]} />);
    expect(screen.getByText('A feed item')).toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });

  it('offers to clear only when there is something to clear', () => {
    const { rerender } = render(<WhileYouWereAway {...base} watching />);
    expect(screen.queryByText(/Clear/)).not.toBeInTheDocument();
    rerender(<WhileYouWereAway {...base} watching items={[
      { id: 'a', source: 'x', at: 'now', state: '1' },
    ]} />);
    expect(screen.getByText('Clear (1)')).toBeInTheDocument();
  });

  it('toggles rather than assuming, so the button reflects real state', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<WhileYouWereAway {...base} onToggle={onToggle} />);
    expect(screen.getByText('Watch in the background')).toBeInTheDocument();
    rerender(<WhileYouWereAway {...base} watching onToggle={onToggle} />);
    expect(screen.getByText('Stop watching')).toBeInTheDocument();
  });
});
