/**
 * Cameras — a still, saved into your own memory.
 *
 * No live view: RTSP does not play in a browser and transcoding it is a
 * server's job. A still is the better trade anyway, because a still is what
 * Theia can search a year later. That is the thing no home dashboard does.
 *
 * Automatic capture only runs while this window is open, and the interface says
 * so where the switch is. A folder that quietly stopped filling would be worse
 * than one that never started: someone would go looking for the day it snowed
 * and find a gap they were never told about.
 */
import type { Entity } from '../lib/homeAssistant';
import { projectedCount } from '../lib/cameras';
import type { CameraState } from '../hooks/useCameraCapture';
import * as s from '../styles';

interface Props {
  cameras: readonly Entity[];
  states: Record<string, CameraState>;
  everyMinutes: number;
  autoOn: boolean;
  onCapture: (entityId: string) => void;
  onToggleAuto: (on: boolean) => void;
  onInterval: (minutes: number) => void;
}

const INTERVALS = [15, 30, 60, 180];

export default function Cameras({
  cameras, states, everyMinutes, autoOn, onCapture, onToggleAuto, onInterval,
}: Props): JSX.Element | null {
  if (cameras.length === 0) return null;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={s.groupLabel}>Cameras · {cameras.length}</p>

      <p style={s.lede}>
        Oikos saves a still into its own vault, where your memory indexes it. Later
        you can ask which days it snowed, or when the gate was left open. It never
        shows a live feed and never records video.
      </p>

      <div style={s.grid}>
        {cameras.map(cam => {
          const st = states[cam.entityId];
          return (
            <div key={cam.entityId} style={s.tile} title={cam.entityId}>
              <span style={s.tileName}>{cam.name}</span>
              <button
                style={s.buttonQuiet}
                onClick={() => onCapture(cam.entityId)}
                disabled={st?.busy === true}
                aria-label={`Capture ${cam.name}`}
              >
                {st?.busy ? 'Capturing…' : 'Capture now'}
              </button>
              {/* Always a sentence, never a silent success: a still that went
                  nowhere looks exactly like one that was saved. */}
              {st?.note && <span style={s.tileName}>{st.note}</span>}
              {st?.saved ? <span style={s.tileName}>{st.saved} saved this session</span> : null}
            </div>
          );
        })}
      </div>

      <div style={s.panel}>
        <p style={s.groupLabel}>Keep an archive</p>
        <p style={s.lede}>
          Capture every camera on a rhythm — <strong>only while this window is
          open</strong>. Close Oikos and it stops; nothing is captured behind your
          back, and no gap is hidden from you.
        </p>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={autoOn ? s.buttonQuiet : s.button} onClick={() => onToggleAuto(!autoOn)}>
            {autoOn ? 'Stop capturing' : 'Start capturing'}
          </button>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={s.tileName}>every</span>
            <select
              aria-label="Capture interval"
              value={everyMinutes}
              onChange={e => onInterval(Number(e.target.value))}
              style={{ ...s.input, width: 'auto', padding: '8px 12px' }}
            >
              {INTERVALS.map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </label>
        </div>

        <p style={{ ...s.lede, fontSize: '13px' }}>
          At that rhythm, a year of one camera is about{' '}
          {projectedCount(everyMinutes, 365).toLocaleString()} pictures in your vault
          folder. They are real files: you can open the folder and delete any of them.
        </p>
      </div>
    </section>
  );
}
