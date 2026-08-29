/**
 * The camera panel makes two promises that are easy to overstate: where the
 * pictures go, and how long the capturing lasts. Both are asserted here.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Cameras from './Cameras';
import { parseStates } from '../lib/homeAssistant';
import { camerasOf } from '../lib/cameras';

const cams = camerasOf(parseStates(JSON.stringify([
  { entity_id: 'camera.jardin', state: 'idle', attributes: { friendly_name: 'Jardin' } },
  { entity_id: 'camera.porte', state: 'idle', attributes: { friendly_name: 'Porte' } },
])) ?? []);


/**
 * Substring search over the rendered text. A function matcher rather than a
 * regex because the thousands separator comes from the runtime locale, and
 * escaping a character that might be a dot into a pattern is a detour with its
 * own bugs.
 */
const hasText = (needle: string): boolean =>
  (document.body.textContent ?? '').includes(`${needle} pictures`);

const base = {
  cameras: cams, states: {}, everyMinutes: 60, autoOn: false,
  onCapture: () => {}, onToggleAuto: () => {}, onInterval: () => {},
};

describe('Cameras', () => {
  it('renders nothing at all when the house has no camera', () => {
    const { container } = render(<Cameras {...base} cameras={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says out loud that capturing stops with the window', () => {
    // A folder that quietly stopped filling is worse than one that never
    // started: someone goes looking for the day it snowed and finds a gap
    // nobody told them about.
    render(<Cameras {...base} />);
    expect(screen.getByText(/only while this window is/i)).toBeInTheDocument();
    expect(screen.getByText(/Close Oikos and it stops/i)).toBeInTheDocument();
  });

  it('says it never shows a live feed or records video', () => {
    render(<Cameras {...base} />);
    expect(screen.getByText(/never shows a live feed and never records video/i)).toBeInTheDocument();
  });

  it('states the real size of the archive before it is started', () => {
    // "One an hour" sounds small. A year of it does not.
    // The expected string is formatted the same way the component formats it:
    // the thousands separator depends on the runtime locale, so hardcoding
    // "8,760" would make this pass or fail on where it runs rather than on
    // whether the number is right.
    render(<Cameras {...base} everyMinutes={60} />);
    expect(hasText((8760).toLocaleString())).toBe(true);
  });

  it('recomputes that number with the chosen rhythm', () => {
    render(<Cameras {...base} everyMinutes={15} />);
    expect(hasText((35_040).toLocaleString())).toBe(true);
  });

  it('captures the camera whose button was pressed', async () => {
    const onCapture = vi.fn();
    render(<Cameras {...base} onCapture={onCapture} />);
    await userEvent.click(screen.getByLabelText('Capture Porte'));
    expect(onCapture).toHaveBeenCalledWith('camera.porte');
  });

  it('shows the outcome of a capture, good or bad, never silence', () => {
    const { rerender } = render(<Cameras {...base} states={{
      'camera.jardin': { busy: false, note: 'Saved to your vault.', saved: 1 },
    }} />);
    expect(screen.getByText('Saved to your vault.')).toBeInTheDocument();

    rerender(<Cameras {...base} states={{
      'camera.jardin': { busy: false, note: 'Not saved: NOT_AN_IMAGE', saved: 0 },
    }} />);
    // A still that went nowhere must not look like one that was saved.
    expect(screen.getByText(/Not saved: NOT_AN_IMAGE/)).toBeInTheDocument();
  });

  it('marks a capture in flight rather than leaving a dead button', () => {
    render(<Cameras {...base} states={{ 'camera.jardin': { busy: true, saved: 0 } }} />);
    expect(screen.getByText('Capturing…')).toBeInTheDocument();
    expect(screen.getByLabelText('Capture Jardin')).toBeDisabled();
  });

  it('offers to stop once it is running', () => {
    render(<Cameras {...base} autoOn />);
    expect(screen.getByText('Stop capturing')).toBeInTheDocument();
  });
});
