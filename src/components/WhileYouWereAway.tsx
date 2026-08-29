/**
 * WhileYouWereAway — the readings that moved with the window closed.
 *
 * The switch says what it does and what it does NOT: the watch runs while
 * Mnemosyne is open, and stops when the app does. Promising a home monitor that
 * keeps going after you quit would be the one lie this whole feature cannot
 * afford, since the person would rely on it.
 */
import type { WatchItem } from '../lib/oikosSdk';
import * as s from '../styles';

interface Props {
  available: boolean;
  missing: string[];
  watching: boolean;
  items: readonly WatchItem[];
  busy: boolean;
  onToggle: (on: boolean) => void;
  onClear: () => void;
}

/** "21.4 °C" from an inbox row, without ever re-deriving a number out of an id. */
function reading(item: WatchItem): string {
  if (item.state === undefined) return '';
  return item.unit ? `${item.state} ${item.unit}` : item.state;
}

export default function WhileYouWereAway({
  available, missing, watching, items, busy, onToggle, onClear,
}: Props): JSX.Element {
  if (!available) {
    return (
      <div style={s.notice}>
        <p style={s.groupLabel}>While you were away</p>
        <p style={{ ...s.lede, marginTop: '8px' }}>
          This version of Mnemosyne OS cannot watch a device in the background
          (missing: {missing.join(', ')}). Everything above still works. Updating
          the app turns this on.
        </p>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <p style={s.groupLabel}>While you were away</p>

      <p style={s.lede}>
        Oikos can keep reading your box after you close this window, and tell you
        what moved. It runs only while Mnemosyne OS itself is open — quit the app
        and the watching stops with it.
      </p>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={watching ? s.buttonQuiet : s.button} onClick={() => onToggle(!watching)} disabled={busy}>
          {watching ? 'Stop watching' : 'Watch in the background'}
        </button>
        {items.length > 0 && (
          <button style={s.buttonQuiet} onClick={onClear} disabled={busy}>
            Clear ({items.length})
          </button>
        )}
      </div>

      {watching && items.length === 0 && (
        <p style={{ ...s.lede, fontSize: '13px' }}>
          Nothing has moved since the last check. The first look never announces
          anything — it only learns what &ldquo;normal&rdquo; is.
        </p>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.slice(0, 40).map(item => (
            <div key={`${item.id}-${item.at}`} style={{
              display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'baseline',
            }}>
              <span style={s.tileName}>{item.label ?? item.id}</span>
              <span style={{ fontFamily: s.MONO, fontSize: '16px' }}>{reading(item)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
