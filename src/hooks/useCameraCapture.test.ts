/**
 * Every way a capture can fail, and the sentence each one produces.
 *
 * This is the file that existed to be written: the capture path had six
 * branches and none of them were covered while it lived inside the component.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraCapture, type CaptureDeps } from './useCameraCapture';
import type { Entity } from '../lib/homeAssistant';

const AT = new Date('2026-08-29T10:05:30.250Z');
const CAM: Entity = {
  entityId: 'camera.jardin', domain: 'camera', state: 'idle', name: 'Jardin', unreadable: false,
};

const okPicture = {
  success: true,
  data: { status: 200, body: 'AAAA', encoding: 'base64' as const, truncated: false, contentType: 'image/jpeg' },
};

let deps: CaptureDeps;

beforeEach(() => {
  deps = {
    lanGet: vi.fn().mockResolvedValue(okPicture),
    saveSnapshot: vi.fn().mockResolvedValue({ success: true, data: { path: 'images/x.jpg', bytes: 3 } }),
    now: () => AT,
  };
});

const run = () => renderHook(() => useCameraCapture('http://192.168.1.8:8123', 'tok', [CAM], deps));

const noteFor = (result: { current: { states: Record<string, { note?: string }> } }): string | undefined =>
  result.current.states['camera.jardin']?.note;

describe('a capture that works', () => {
  it('asks the camera proxy and stores under a readable name', async () => {
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toBeDefined());

    expect(deps.lanGet).toHaveBeenCalledWith(
      'http://192.168.1.8:8123', '/api/camera_proxy/camera.jardin', 'tok',
    );
    expect(deps.saveSnapshot).toHaveBeenCalledWith('jardin-2026-08-29T10-05-30-250.jpg', 'AAAA');
    expect(noteFor(result)).toBe('Saved to your vault.');
    expect(result.current.states['camera.jardin']?.saved).toBe(1);
  });
});

describe('every failure ends in a sentence, and nothing is stored', () => {
  it('the host refused the device', async () => {
    deps.lanGet = vi.fn().mockResolvedValue({ success: false, error: 'HOST_NOT_GRANTED' });
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toMatch(/allowed Oikos to reach/i));
    expect(deps.saveSnapshot).not.toHaveBeenCalled();
  });

  it('Home Assistant refused the token', async () => {
    deps.lanGet = vi.fn().mockResolvedValue({ ...okPicture, data: { ...okPicture.data, status: 401 } });
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toMatch(/token/i));
    expect(deps.saveSnapshot).not.toHaveBeenCalled();
  });

  it('REFUSES a body that came back as text — that is not a picture', async () => {
    // Without this branch a login page would be stored under a .jpg name and
    // sit in the archive as though it were that day's snapshot.
    deps.lanGet = vi.fn().mockResolvedValue({
      ...okPicture,
      data: { ...okPicture.data, encoding: 'utf8', body: '<html>login</html>', contentType: 'text/html' },
    });
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toMatch(/not a picture/i));
    expect(deps.saveSnapshot).not.toHaveBeenCalled();
  });

  it('REFUSES a truncated picture rather than archiving a corrupt one', async () => {
    deps.lanGet = vi.fn().mockResolvedValue({ ...okPicture, data: { ...okPicture.data, truncated: true } });
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toMatch(/nothing was saved/i));
    expect(deps.saveSnapshot).not.toHaveBeenCalled();
  });

  it('reports the vault refusing the file, rather than counting it as saved', async () => {
    deps.saveSnapshot = vi.fn().mockResolvedValue({ success: false, error: 'NOT_AN_IMAGE' });
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toBe('Not saved: NOT_AN_IMAGE'));
    expect(result.current.states['camera.jardin']?.saved).toBe(0);
  });

  it('survives a throw instead of leaving the tile spinning forever', async () => {
    deps.lanGet = vi.fn().mockRejectedValue(new Error('bridge died'));
    const { result } = run();
    act(() => result.current.capture('camera.jardin'));
    await waitFor(() => expect(noteFor(result)).toMatch(/bridge died/));
    expect(result.current.states['camera.jardin']?.busy).toBe(false);
  });
});

describe('the rhythm', () => {
  // Block body on purpose: the concise form returns `vi`, which a hook reads as
  // a cleanup callback it should call afterwards.
  beforeEach(() => { vi.useFakeTimers(); });

  it('does nothing at all while it is off', () => {
    run();
    vi.advanceTimersByTime(3 * 60 * 60_000);
    expect(deps.lanGet).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fires on the chosen interval, and stops when switched off', () => {
    const { result } = run();
    act(() => { result.current.setEveryMinutes(15); result.current.setAutoOn(true); });

    act(() => { vi.advanceTimersByTime(15 * 60_000); });
    expect(deps.lanGet).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(15 * 60_000); });
    expect(deps.lanGet).toHaveBeenCalledTimes(2);

    act(() => result.current.setAutoOn(false));
    act(() => { vi.advanceTimersByTime(60 * 60_000); });
    // Switching off means off: no straggler fires after the switch.
    expect(deps.lanGet).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
