/**
 * cameras.ts — turning a Home Assistant camera into a picture in your memory.
 *
 * The point is not the live view; a live view is a browser problem and a
 * transcoding job. The point is that a still, saved every so often, becomes
 * something Theia can search a year later: "show me the days it snowed", "when
 * was the gate left open". That is a thing no home dashboard does, and it only
 * needs a JPEG and a filename.
 */
import type { Entity } from './homeAssistant';

/** HA serves a still for any camera entity here, whatever the brand behind it. */
export function snapshotPath(entityId: string): string {
  return `/api/camera_proxy/${encodeURIComponent(entityId)}`;
}

export function camerasOf(entities: readonly Entity[]): Entity[] {
  return entities.filter(e => e.domain === 'camera');
}

/**
 * The filename a snapshot is stored under.
 *
 * Two jobs, and they pull in opposite directions. It has to be unique enough
 * that an archive accumulates rather than overwriting itself, and readable
 * enough that a human opening the folder in a file browser knows what they are
 * looking at — which is the whole reason the vault keeps real files.
 *
 * The timestamp is the caller's, never `new Date()` inside: a name built from a
 * clock the test cannot hold still is a name the test cannot assert.
 */
export function snapshotName(entityId: string, at: Date): string {
  const slug = entityId
    .replace(/^camera\./, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'camera';
  // Colons are legal in an ISO string and illegal in a Windows filename, and
  // the host refuses anything outside [A-Za-z0-9._-] anyway.
  const stamp = at.toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
  return `${slug}-${stamp}.jpg`;
}

/**
 * How many snapshots an hourly rhythm would accumulate. Shown before the
 * capture starts, because "one an hour" sounds small and a year of it is 8760
 * files in a folder someone will eventually open.
 */
export function projectedCount(everyMinutes: number, days: number): number {
  if (everyMinutes <= 0 || days <= 0) return 0;
  return Math.floor((days * 24 * 60) / everyMinutes);
}
