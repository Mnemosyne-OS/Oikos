/**
 * Oikos — your home, remembered.
 *
 * Reads what Home Assistant already knows, over the user's own network, after
 * the OS has asked them about that exact device. It never controls anything:
 * the host action it uses is a GET and nothing else exists.
 *
 * The rule this file keeps: every failure gets a NAME. A cartridge that cannot
 * read is one keystroke away from rendering an empty grid, and an empty grid is
 * indistinguishable from a house with no sensors in it.
 */
import { useCallback, useEffect, useState } from 'react';
import * as s from './styles';
import Cameras from './components/Cameras';
import Readings from './components/Readings';
import Setup from './components/Setup';
import WhileYouWereAway from './components/WhileYouWereAway';
import { useCameraCapture } from './hooks/useCameraCapture';
import {
  explain, explainStatus, missingCapabilities, REQUIRED_CAPABILITIES, WATCH_CAPABILITIES,
} from './lib/connection';
import { camerasOf } from './lib/cameras';
import { parseStates, sensorsOf, type Entity } from './lib/homeAssistant';
import {
  clearInbox, hostStatus, lanGet, loadSaved, registerWatch, save,
  unregisterWatch, watchInbox, type WatchItem,
} from './lib/oikosSdk';

const WATCH_INTERVAL_MIN = 5;
/** Half a degree is a change worth hearing about; a tenth is a thermometer's own noise. */
const WATCH_STEP = 0.5;

type Phase = 'starting' | 'setup' | 'connecting' | 'ready';

export default function App(): JSX.Element {
  const [phase, setPhase] = useState<Phase>('starting');
  const [caps, setCaps] = useState<string[] | undefined>(undefined);
  const [capsRead, setCapsRead] = useState(false);
  const [saved, setSaved] = useState<{ baseUrl: string; token: string; watching: boolean }>({
    baseUrl: '', token: '', watching: false,
  });
  const [entities, setEntities] = useState<Entity[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [inbox, setInbox] = useState<WatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [cameras, setCameras] = useState<Entity[]>([]);
  // Capturing lives in its own hook: it is the part with the most ways to fail,
  // and each one has to end in a sentence the tile can show.
  const cams = useCameraCapture(saved.baseUrl, saved.token, cameras);

  const canWatch = capsRead && missingCapabilities(caps, WATCH_CAPABILITIES).length === 0;
  const missingForRead = capsRead ? missingCapabilities(caps, REQUIRED_CAPABILITIES) : [];

  /** One read of the box. Every branch produces a sentence, never a blank screen. */
  const readStates = useCallback(async (baseUrl: string, token: string): Promise<boolean> => {
    const res = await lanGet(baseUrl, '/api/states', token);
    if (!res.success) {
      setProblem(explain(res.error ?? 'NETWORK_ERROR').message);
      return false;
    }
    const status = res.data?.status ?? 0;
    if (status < 200 || status >= 300) {
      setProblem(explainStatus(status).message);
      return false;
    }
    if (res.data?.truncated) {
      // Half a JSON is not a small JSON. Showing the sensors that survived the
      // cut would be a house with rooms silently missing from it.
      setProblem('Home Assistant sent more than Oikos can read in one go. Nothing is shown rather than part of your house.');
      return false;
    }
    const parsed = parseStates(res.data?.body ?? '');
    if (parsed === null) {
      setProblem('That address answered, but not with the Home Assistant API. Check the port.');
      return false;
    }
    // Sensors and cameras are kept apart: one is a reading, the other is a
    // picture, and only the second one writes anything to disk.
    setEntities(sensorsOf(parsed));
    setCameras(camerasOf(parsed));
    setProblem(null);
    return true;
  }, []);

  // Boot: what can this host do, and do we already know where the box is?
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const status = await hostStatus();
        if (!alive) return;
        setCaps(status?.capabilities);
      } catch {
        // Unreadable is not "has none", but for a gate that decides whether to
        // even try, the safe reading is the same and it is named below.
        if (alive) setCaps(undefined);
      }
      if (!alive) return;
      setCapsRead(true);

      const stored = await loadSaved();
      if (!alive) return;
      if (stored.baseUrl && stored.token) {
        setSaved({ baseUrl: stored.baseUrl, token: stored.token, watching: stored.watching === true });
        setPhase('connecting');
        await readStates(stored.baseUrl, stored.token);
        if (alive) setPhase('ready');
      } else {
        setPhase('setup');
      }
    })();
    return () => { alive = false; };
  }, [readStates]);

  // The inbox is the point of watching, so it is read whenever watching is on.
  useEffect(() => {
    if (!saved.watching || !canWatch) return;
    let alive = true;
    void (async () => {
      try {
        const items = await watchInbox();
        if (alive) setInbox(items);
      } catch { /* an unreadable inbox stays empty; the panel says nothing arrived */ }
    })();
    return () => { alive = false; };
  }, [saved.watching, canWatch, phase]);

  const connect = async (baseUrl: string, token: string): Promise<void> => {
    setBusy(true);
    setPhase('connecting');
    try {
      const ok = await readStates(baseUrl, token);
      setSaved(prev => ({ ...prev, baseUrl, token }));
      if (ok) await save({ baseUrl, token, watching: saved.watching, intervalMin: WATCH_INTERVAL_MIN, step: WATCH_STEP });
      setPhase('ready');
    } catch (err) {
      setProblem(String(err));
      setPhase('ready');
    } finally {
      setBusy(false);
    }
  };

  const toggleWatch = async (on: boolean): Promise<void> => {
    setBusy(true);
    try {
      if (on) await registerWatch(saved.baseUrl, WATCH_INTERVAL_MIN, WATCH_STEP);
      else await unregisterWatch();
      setSaved(prev => ({ ...prev, watching: on }));
      await save({ ...saved, watching: on, intervalMin: WATCH_INTERVAL_MIN, step: WATCH_STEP });
      if (!on) setInbox([]);
    } catch (err) {
      setProblem(String(err));
    } finally {
      setBusy(false);
    }
  };

  const clear = async (): Promise<void> => {
    setBusy(true);
    try { await clearInbox(); setInbox([]); } catch { /* the list simply stays */ }
    finally { setBusy(false); }
  };

  // An OS without the local-network door cannot be talked around. Say which
  // piece is missing, so this reads as "update me", never as a broken app.
  if (capsRead && missingForRead.length > 0) {
    return (
      <div style={s.page}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1 style={s.h1}>Oikos</h1>
          <p style={s.lede}>Your home, remembered.</p>
        </header>
        <div style={s.noticeBad}>
          This version of Mnemosyne OS cannot reach devices on your local network
          (missing: {missingForRead.join(', ')}). Oikos needs that door to read your
          Home Assistant. Updating the app is all it takes.
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={s.h1}>Oikos</h1>
        <p style={s.lede}>
          Your home, remembered. Oikos reads what Home Assistant already knows,
          on your own network. It never switches anything on or off.
        </p>
      </header>

      {phase === 'starting' && <p style={s.lede}>Looking around…</p>}

      {(phase === 'setup' || (phase === 'ready' && entities === null)) && (
        <Setup
          initialUrl={saved.baseUrl}
          initialToken={saved.token}
          busy={busy}
          onConnect={(u, t) => void connect(u, t)}
        />
      )}

      {phase === 'connecting' && <p style={s.lede}>Reading your box…</p>}

      {problem && <div style={s.noticeBad}>{problem}</div>}

      {phase === 'ready' && entities !== null && (
        <>
          <Readings entities={entities} />
          <Cameras
            cameras={cameras}
            states={cams.states}
            everyMinutes={cams.everyMinutes}
            autoOn={cams.autoOn}
            onCapture={cams.capture}
            onToggleAuto={cams.setAutoOn}
            onInterval={cams.setEveryMinutes}
          />
          <WhileYouWereAway
            available={canWatch}
            missing={missingCapabilities(caps, WATCH_CAPABILITIES)}
            watching={saved.watching}
            items={inbox}
            busy={busy}
            onToggle={on => void toggleWatch(on)}
            onClear={() => void clear()}
          />
          <div>
            <button style={s.buttonQuiet} onClick={() => setEntities(null)}>
              Change device
            </button>
          </div>
        </>
      )}
    </div>
  );
}
