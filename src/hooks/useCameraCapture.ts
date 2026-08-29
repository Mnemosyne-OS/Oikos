/**
 * useCameraCapture — fetching a still and putting it in the vault.
 *
 * This lives on its own because it is the part with the most ways to go wrong,
 * and every one of them has to end in a sentence on the tile. A snapshot that
 * silently went nowhere looks exactly like one that was saved, and the whole
 * value of an archive is being able to trust it a year later.
 *
 * It is a hook rather than a lump inside the app component so those branches
 * can be tested one by one — which is how the "answered with text, not a
 * picture" case earns its keep.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { snapshotName, snapshotPath } from '../lib/cameras';
import { explain, explainStatus } from '../lib/connection';
import type { Entity } from '../lib/homeAssistant';
import { lanGet, saveSnapshot } from '../lib/oikosSdk';

export interface CameraState {
  /** Capturing right now, so the button says so instead of looking dead. */
  busy: boolean;
  /** Last outcome for this camera, good or bad — never nothing. */
  note?: string;
  saved: number;
}

export interface CameraCapture {
  states: Record<string, CameraState>;
  autoOn: boolean;
  everyMinutes: number;
  capture: (entityId: string) => void;
  setAutoOn: (on: boolean) => void;
  setEveryMinutes: (minutes: number) => void;
}

/** Injected so tests drive the two host calls without a running Mnemosyne. */
export interface CaptureDeps {
  lanGet: typeof lanGet;
  saveSnapshot: typeof saveSnapshot;
  /** The clock, so a filename is something a test can assert. */
  now: () => Date;
}

const REAL: CaptureDeps = { lanGet, saveSnapshot, now: () => new Date() };

export function useCameraCapture(
  baseUrl: string,
  token: string,
  cameras: readonly Entity[],
  deps: CaptureDeps = REAL,
): CameraCapture {
  const [states, setStates] = useState<Record<string, CameraState>>({});
  const [autoOn, setAutoOn] = useState(false);
  const [everyMinutes, setEveryMinutes] = useState(60);

  // The interval fires with whatever cameras exist AT THAT MOMENT. Reading them
  // from a ref rather than closing over them keeps the timer from being torn
  // down and rebuilt every time the list is re-fetched, which would reset the
  // rhythm and mean a slow poll never fires at all.
  const camerasRef = useRef(cameras);
  camerasRef.current = cameras;

  const capture = useCallback(async (entityId: string): Promise<void> => {
    setStates(prev => ({
      ...prev,
      [entityId]: { ...prev[entityId], busy: true, saved: prev[entityId]?.saved ?? 0 },
    }));
    const done = (note: string, savedDelta = 0): void =>
      setStates(prev => ({
        ...prev,
        [entityId]: { busy: false, note, saved: (prev[entityId]?.saved ?? 0) + savedDelta },
      }));

    try {
      const res = await deps.lanGet(baseUrl, snapshotPath(entityId), token);
      if (!res.success) { done(explain(res.error ?? 'NETWORK_ERROR').message); return; }

      const status = res.data?.status ?? 0;
      if (status < 200 || status >= 300) { done(explainStatus(status).message); return; }

      // A still that came back as text is not a still. The host names the
      // encoding precisely so this can be checked rather than assumed — the
      // alternative is storing a page of HTML under a .jpg name.
      if (res.data?.encoding !== 'base64') {
        done('That camera answered with something that is not a picture.');
        return;
      }
      if (res.data.truncated) {
        // Half a JPEG is a corrupt file, not a small one. Saving it would put a
        // broken picture in the archive and call it that day's snapshot.
        done('The picture was larger than Oikos can read in one go, so nothing was saved.');
        return;
      }

      const stored = await deps.saveSnapshot(snapshotName(entityId, deps.now()), res.data.body);
      done(
        stored.success ? 'Saved to your vault.' : `Not saved: ${stored.error ?? 'unknown'}`,
        stored.success ? 1 : 0,
      );
    } catch (err) {
      done(String(err));
    }
  }, [baseUrl, token, deps]);

  useEffect(() => {
    if (!autoOn) return;
    const id = setInterval(() => {
      for (const cam of camerasRef.current) void capture(cam.entityId);
    }, everyMinutes * 60_000);
    return () => clearInterval(id);
  }, [autoOn, everyMinutes, capture]);

  return {
    states, autoOn, everyMinutes,
    capture: id => void capture(id),
    setAutoOn, setEveryMinutes,
  };
}
