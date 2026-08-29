/**
 * oikosSdk.ts — the four host actions Oikos uses, typed.
 *
 * Thin by design: no transport lives here — the shared SDK owns that — only the
 * shapes, so the components never hold a bare `invoke` string and a cast next to
 * each other.
 */
import { MnemoCartridgeSDK } from '../sdk/mnemo-sdk';
import { watchTargetFor } from './homeAssistant';

export const APP_ID = '@mnemosyne-plugins/oikos';
const sdk = new MnemoCartridgeSDK(APP_ID);

export interface HostStatus { capabilities?: string[]; platform?: string }

export interface LanResult {
  success: boolean;
  data?: {
    status: number;
    /** In the encoding named below: a camera still arrives base64, a JSON as text. */
    body: string;
    encoding: 'utf8' | 'base64';
    /** A prefix, not the whole. Fatal for a picture: half a JPEG is corrupt, not small. */
    truncated: boolean;
    contentType: string;
  };
  error?: string;
}

export interface WatchItem {
  id: string; label?: string; source: string; at: string;
  state?: string; value?: number; unit?: string;
}

/** What this build of the OS can do. Absent capabilities are the honest signal, so never defaulted. */
export async function hostStatus(): Promise<HostStatus> {
  return await sdk.invoke<HostStatus>('getStatus', {});
}

/**
 * Read one path off the box. The first call for a given host makes the OS ask
 * the human, so this is where consent happens; there is nothing to do about it
 * here but wait for the answer, which is why the timeout is generous.
 */
export async function lanGet(baseUrl: string, path: string, token: string): Promise<LanResult> {
  return await sdk.invoke<LanResult>('lan.fetch', {
    url: `${baseUrl}${path}`,
    name: 'Oikos',
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  }, 120_000);
}

/** The devices this cartridge is allowed to reach — used to say "not approved yet" before trying. */
export async function myGrants(): Promise<string[]> {
  const res = await sdk.invoke<{ success: boolean; data?: { hosts: string[] } }>('lan.grants', {});
  return res?.data?.hosts ?? [];
}

/** Keep reading the box while this window is closed. One target for the whole box. */
export async function registerWatch(baseUrl: string, intervalMin: number, step?: number): Promise<void> {
  await sdk.invoke('watch.register', {
    targets: [watchTargetFor(baseUrl, step)],
    intervalMin,
    notify: true,
  });
}

export async function unregisterWatch(): Promise<void> {
  await sdk.invoke('watch.unregister', {});
}

export async function watchInbox(): Promise<WatchItem[]> {
  const res = await sdk.invoke<{ success: boolean; data?: { items: WatchItem[] } }>('watch.inbox', {});
  return res?.data?.items ?? [];
}

export async function clearInbox(): Promise<void> {
  await sdk.invoke('watch.clearInbox', {});
}

/**
 * Put a still into Oikos's OWN vault, where DocWatch will ingest it and Theia
 * will index it. The host derives the destination from the app id, so there is
 * no path to pass and none to get wrong.
 */
export async function saveSnapshot(name: string, base64: string): Promise<{ success: boolean; data?: { path: string; bytes: number }; error?: string }> {
  return await sdk.invoke('vault.sandbox.saveImage', { name, base64 });
}

export interface Saved { baseUrl: string; token: string; watching: boolean; intervalMin: number; step: number }

/**
 * The cartridge's own settings blob. It holds the Home Assistant token, and the
 * UI says so out loud: this is a local file, not a vault, and nothing here is
 * encrypted. An HA long-lived token is revocable from Home Assistant itself,
 * which is the honest mitigation to offer rather than implying secrecy we do
 * not provide.
 */
export async function loadSaved(): Promise<Partial<Saved>> {
  try {
    // The blob is the whole settings object, keyed by cartridge id host-side.
    return (await sdk.invoke<Partial<Saved> | null>('state.get', {})) ?? {};
  } catch {
    // A blob we cannot read is an empty one, and the setup form is the right
    // place to land: it asks for exactly what is missing.
    return {};
  }
}

export async function save(value: Saved): Promise<void> {
  await sdk.invoke('state.set', { state: value });
}
