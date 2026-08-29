/**
 * connection.ts — where the box is, what a refusal means, and what the host
 * has to be able to do before any of it is worth showing.
 *
 * Pure on purpose. Every sentence a user reads when something goes wrong is
 * decided here, testable, instead of being assembled inline next to a fetch.
 */

/** Exactly the refusals Mnemosyne OS can return for a local-network read. */
export type Refusal =
  | 'SCHEME_NOT_ALLOWED' | 'HOST_NOT_GRANTED' | 'INVALID_URL'
  | 'NOT_A_PRIVATE_ADDRESS' | 'DNS_FAILED' | 'BAD_HEADER'
  | 'REDIRECT_REFUSED' | 'LAN_TIMEOUT' | 'NETWORK_ERROR';

export interface Explained {
  /** What to tell the person looking at the screen. */
  message: string;
  /**
   * Is trying the same thing again reasonable?
   *
   * It matters because the two ends of this list must not be treated alike: a
   * timeout is worth another go, a denial is a decision, and retrying a
   * decision behind someone's back is how an app teaches people to stop
   * reading dialogs.
   */
  retryable: boolean;
  /** Does fixing this mean editing the address rather than the network? */
  fixAddress: boolean;
}

const EXPLAINED: Record<Refusal, Explained> = {
  HOST_NOT_GRANTED: {
    message: 'You have not allowed Oikos to reach this device — or you took the permission back. Try again and Mnemosyne will ask.',
    retryable: true, fixAddress: false,
  },
  NOT_A_PRIVATE_ADDRESS: {
    message: 'That address is not on your local network. Oikos can only read devices in your own home, never something out on the internet.',
    retryable: false, fixAddress: true,
  },
  INVALID_URL: {
    message: 'That address cannot be read as a URL. It should look like 192.168.1.8:8123 or homeassistant.local:8123.',
    retryable: false, fixAddress: true,
  },
  SCHEME_NOT_ALLOWED: {
    message: 'Only http and https addresses can be opened.',
    retryable: false, fixAddress: true,
  },
  DNS_FAILED: {
    message: 'That name could not be resolved. If you used homeassistant.local, try its IP address instead — some networks do not answer .local names.',
    retryable: true, fixAddress: true,
  },
  LAN_TIMEOUT: {
    message: 'The device did not answer in time. It may be off, asleep, or on a different network than this computer.',
    retryable: true, fixAddress: false,
  },
  NETWORK_ERROR: {
    message: 'The connection was refused. Check the port, and that Home Assistant is running.',
    retryable: true, fixAddress: true,
  },
  REDIRECT_REFUSED: {
    message: 'The device redirected the request. Oikos does not follow redirects, because the destination is not the address you approved. Use the address it redirects to.',
    retryable: false, fixAddress: true,
  },
  BAD_HEADER: {
    message: 'That token contains characters that cannot be sent. Paste it again without line breaks.',
    retryable: false, fixAddress: false,
  },
};

/**
 * Explain a failure. An unknown code is reported VERBATIM rather than folded
 * into a friendly catch-all: a sentence invented for an error nobody has seen
 * is worse than the code itself, because it sends the reader looking in the
 * wrong place.
 */
export function explain(code: string): Explained {
  return EXPLAINED[code as Refusal]
    ?? { message: `Unexpected answer from the host: ${code}`, retryable: true, fixAddress: false };
}

/** An HTTP status the device itself returned, which is a different kind of problem. */
export function explainStatus(status: number): Explained {
  if (status === 401 || status === 403) {
    return {
      message: 'Home Assistant refused the token. Create a long-lived access token in your HA profile and paste it here.',
      retryable: false, fixAddress: false,
    };
  }
  if (status === 404) {
    return {
      message: 'That address answered, but not with the Home Assistant API. Check the port.',
      retryable: false, fixAddress: true,
    };
  }
  return { message: `Home Assistant answered ${status}.`, retryable: true, fixAddress: false };
}

/**
 * Turn whatever someone typed into a base URL, or say why not.
 *
 * People type `192.168.1.8:8123`, and a bare host is the normal case rather
 * than the sloppy one. Assuming http is right for this and only this: a home
 * box on the local network is overwhelmingly plain http, and guessing https
 * would produce a TLS error instead of a working dashboard.
 */
export function normalizeBaseUrl(input: string): { ok: true; url: string } | { ok: false; reason: string } {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: 'Enter the address of your Home Assistant.' };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let u: URL;
  try { u = new URL(withScheme); } catch { return { ok: false, reason: 'That is not an address Oikos can read.' }; }
  if (!u.hostname) return { ok: false, reason: 'That address has no host in it.' };
  // Trailing slash and any path are dropped: everything is built as
  // `${base}/api/...`, and a base ending in `/` would produce `//api`, which
  // some proxies answer with a redirect — refused one layer down.
  return { ok: true, url: `${u.protocol}//${u.host}` };
}

/** A long-lived HA token is a JWT-ish blob; all that matters here is it survives a header. */
export function tokenLooksSendable(token: string): boolean {
  return token.trim().length > 0 && !/[\r\n\0]/.test(token);
}

/**
 * Capabilities this cartridge cannot work without, and which of them the host
 * is missing.
 *
 * Asked rather than inferred from a version number. The point is that an older
 * host produces a NAMED reason instead of an empty dashboard, since an empty
 * dashboard is indistinguishable from a broken one.
 */
export const REQUIRED_CAPABILITIES = ['net.lan'] as const;
export const WATCH_CAPABILITIES = ['watch.background', 'watch.value'] as const;

export function missingCapabilities(
  hostCapabilities: readonly string[] | undefined,
  wanted: readonly string[] = REQUIRED_CAPABILITIES,
): string[] {
  // An OS old enough to predate the capability list reports nothing at all, and
  // that is precisely the OS that lacks these — absent means missing here, and
  // saying so is the honest answer rather than hoping.
  const have = new Set(hostCapabilities ?? []);
  return wanted.filter(c => !have.has(c));
}
