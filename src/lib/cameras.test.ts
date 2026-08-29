import { describe, expect, it } from 'vitest';
import { camerasOf, projectedCount, snapshotName, snapshotPath } from './cameras';
import { parseStates } from './homeAssistant';

const AT = new Date('2026-08-29T10:05:30.250Z');

describe('camerasOf', () => {
  it('picks camera entities out of everything else', () => {
    const all = parseStates(JSON.stringify([
      { entity_id: 'camera.jardin', state: 'idle', attributes: { friendly_name: 'Jardin' } },
      { entity_id: 'sensor.salon', state: '21' },
    ])) ?? [];
    expect(camerasOf(all).map(c => c.entityId)).toEqual(['camera.jardin']);
  });
});

describe('snapshotPath', () => {
  it('is the HA still endpoint, whatever brand is behind it', () => {
    expect(snapshotPath('camera.jardin')).toBe('/api/camera_proxy/camera.jardin');
  });

  it('encodes an id so it cannot become extra path', () => {
    expect(snapshotPath('camera.a/b')).toBe('/api/camera_proxy/camera.a%2Fb');
  });
});

describe('snapshotName', () => {
  it('is readable AND unique — a human opens this folder', () => {
    expect(snapshotName('camera.jardin', AT)).toBe('jardin-2026-08-29T10-05-30-250.jpg');
  });

  it('carries no character the host will refuse', () => {
    // The host allows [A-Za-z0-9._-] only, and colons are legal in ISO strings
    // and illegal in Windows filenames.
    for (const id of ['camera.porte d\'entrée', 'camera.A/B:C', 'camera.é#!']) {
      expect(snapshotName(id, AT)).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });

  it('never produces an empty slug', () => {
    expect(snapshotName('camera.###', AT)).toMatch(/^camera-/);
  });

  it('changes with the clock, so an archive accumulates instead of overwriting', () => {
    const later = new Date(AT.getTime() + 3600_000);
    expect(snapshotName('camera.jardin', later)).not.toBe(snapshotName('camera.jardin', AT));
  });

  it('is stable for the same instant, so a double click does not double-store', () => {
    expect(snapshotName('camera.jardin', AT)).toBe(snapshotName('camera.jardin', new Date(AT)));
  });
});

describe('projectedCount', () => {
  it('says how big "one an hour" really gets', () => {
    // "Every hour" sounds small; a year of it is a folder someone will open.
    expect(projectedCount(60, 365)).toBe(8760);
    expect(projectedCount(60, 1)).toBe(24);
  });

  it('is zero rather than infinite for nonsense', () => {
    expect(projectedCount(0, 10)).toBe(0);
    expect(projectedCount(-5, 10)).toBe(0);
    expect(projectedCount(60, 0)).toBe(0);
  });
});
