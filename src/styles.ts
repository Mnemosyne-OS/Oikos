/**
 * styles.ts — ATELIER, on the host's own tokens.
 *
 * Colors come from `var(--…)` because the host pushes its palette into the
 * frame (`onHostConfig`), so a cartridge that hardcodes hex drifts the moment
 * the app's theme moves. Spacing is the 8pt grid; sizes come from the type
 * scale (13 · 16 · 20 · 25 · 31) and nowhere else.
 *
 * Two voices: Georgia for what a person says, mono for what a machine reports.
 * A temperature is the machine talking, so readings are always mono.
 */
import type { CSSProperties } from 'react';

export const SERIF = 'Georgia, "Iowan Old Style", serif';
export const MONO = 'ui-monospace, "Cascadia Code", Consolas, monospace';

export const page: CSSProperties = {
  fontFamily: SERIF,
  color: 'var(--text-primary, #e8e6e3)',
  background: 'var(--bg-base, #14110f)',
  minHeight: '100vh',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
};

export const h1: CSSProperties = {
  fontSize: '31px', fontWeight: 400, lineHeight: 1.2, margin: 0,
};

export const lede: CSSProperties = {
  fontSize: '16px', lineHeight: 1.6, color: 'var(--text-muted, #9b948d)',
  margin: 0, maxWidth: '62ch',
};

/** Group heading. Mono because it labels machine output, and small so it recedes. */
export const groupLabel: CSSProperties = {
  fontFamily: MONO, fontSize: '13px', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-muted, #9b948d)', margin: 0,
};

export const panel: CSSProperties = {
  background: 'var(--bg-surface, #1d1917)',
  border: '1px solid var(--border-subtle, #2f2926)',
  borderRadius: '8px',
  padding: '24px',
  display: 'flex', flexDirection: 'column', gap: '16px',
};

export const tile: CSSProperties = {
  background: 'var(--bg-surface, #1d1917)',
  border: '1px solid var(--border-subtle, #2f2926)',
  borderRadius: '8px',
  padding: '16px',
  display: 'flex', flexDirection: 'column', gap: '8px',
  minWidth: 0,
};

/** The reading itself: the one thing on a tile worth looking at. */
export const reading: CSSProperties = {
  fontFamily: MONO, fontSize: '25px', lineHeight: 1.2,
  color: 'var(--text-primary, #e8e6e3)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

/** A device that is not answering. Dimmed via a token, never via opacity on text. */
export const readingAbsent: CSSProperties = {
  ...reading, color: 'var(--text-muted, #9b948d)',
};

export const tileName: CSSProperties = {
  fontSize: '13px', color: 'var(--text-muted, #9b948d)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

export const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))',
  gap: '16px',
};

export const input: CSSProperties = {
  fontFamily: MONO, fontSize: '13px',
  padding: '12px 16px', borderRadius: '8px',
  background: 'var(--bg-base, #14110f)',
  border: '1px solid var(--border-subtle, #2f2926)',
  color: 'var(--text-primary, #e8e6e3)',
  width: '100%', boxSizing: 'border-box',
};

export const button: CSSProperties = {
  fontFamily: SERIF, fontSize: '16px',
  padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
  background: 'var(--accent-teal, #2b6f6a)',
  border: '1px solid var(--accent-teal, #2b6f6a)',
  color: 'var(--text-on-accent, #f4f1ee)',
};

export const buttonQuiet: CSSProperties = {
  ...button,
  background: 'transparent',
  border: '1px solid var(--border-subtle, #2f2926)',
  color: 'var(--text-secondary, #c4bdb6)',
};

export const notice: CSSProperties = {
  ...panel, padding: '16px 24px',
  fontSize: '16px', lineHeight: 1.6, maxWidth: '62ch',
};

export const noticeBad: CSSProperties = {
  ...notice,
  borderColor: 'var(--accent-red, #a8443c)',
  color: 'var(--text-primary, #e8e6e3)',
};
