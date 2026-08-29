/**
 * What the user is told when it does not work, and what Oikos refuses to
 * pretend it can do.
 */
import { describe, expect, it } from 'vitest';
import {
  explain, explainStatus, missingCapabilities, normalizeBaseUrl,
  REQUIRED_CAPABILITIES, tokenLooksSendable, WATCH_CAPABILITIES,
} from './connection';

describe('normalizeBaseUrl', () => {
  it('accepts a bare host:port, which is what people actually type', () => {
    expect(normalizeBaseUrl('192.168.1.8:8123')).toEqual({ ok: true, url: 'http://192.168.1.8:8123' });
    expect(normalizeBaseUrl('homeassistant.local:8123')).toEqual({ ok: true, url: 'http://homeassistant.local:8123' });
  });

  it('keeps an explicit scheme rather than overriding it', () => {
    expect(normalizeBaseUrl('https://ha.home:8123')).toEqual({ ok: true, url: 'https://ha.home:8123' });
  });

  it('drops a trailing slash and any path', () => {
    // A base ending in "/" builds "//api/states", which some proxies answer
    // with a redirect — and redirects are refused one layer down.
    expect(normalizeBaseUrl('http://192.168.1.8:8123/')).toEqual({ ok: true, url: 'http://192.168.1.8:8123' });
    expect(normalizeBaseUrl('http://192.168.1.8:8123/lovelace/0')).toEqual({ ok: true, url: 'http://192.168.1.8:8123' });
  });

  it('trims, because a pasted address carries whitespace', () => {
    expect(normalizeBaseUrl('  192.168.1.8:8123 \n')).toEqual({ ok: true, url: 'http://192.168.1.8:8123' });
  });

  it('says why rather than silently producing something unusable', () => {
    expect(normalizeBaseUrl('')).toMatchObject({ ok: false });
    expect(normalizeBaseUrl('   ')).toMatchObject({ ok: false });
    expect(normalizeBaseUrl('http://')).toMatchObject({ ok: false });
  });
});

describe('tokenLooksSendable', () => {
  it('accepts a long-lived token', () => {
    expect(tokenLooksSendable('eyJhbGciOiJIUzI1NiJ9.abc.def')).toBe(true);
  });

  it('refuses one carrying a line break, before the host has to', () => {
    // The host refuses this as BAD_HEADER; catching it here means the user is
    // told to paste it again instead of reading a protocol error.
    expect(tokenLooksSendable('abc\r\nX-Evil: 1')).toBe(false);
    expect(tokenLooksSendable('  ')).toBe(false);
  });
});

describe('explain', () => {
  it('keeps a denial apart from a timeout', () => {
    // Retrying a decision behind someone's back is how an app teaches people
    // to stop reading dialogs.
    expect(explain('LAN_TIMEOUT').retryable).toBe(true);
    expect(explain('NOT_A_PRIVATE_ADDRESS').retryable).toBe(false);
  });

  it('says which failures are fixed by editing the address', () => {
    expect(explain('INVALID_URL').fixAddress).toBe(true);
    expect(explain('HOST_NOT_GRANTED').fixAddress).toBe(false);
  });

  it('tells someone their permission can simply be asked for again', () => {
    expect(explain('HOST_NOT_GRANTED').message).toMatch(/ask/i);
  });

  it('reports an unknown code VERBATIM instead of inventing a friendly sentence', () => {
    // A made-up explanation for an error nobody has seen sends the reader
    // looking in the wrong place.
    expect(explain('SOMETHING_NEW').message).toContain('SOMETHING_NEW');
  });

  it('never explains a failure as an empty house', () => {
    for (const code of ['LAN_TIMEOUT', 'NETWORK_ERROR', 'DNS_FAILED', 'HOST_NOT_GRANTED']) {
      expect(explain(code).message).not.toMatch(/no (device|sensor)s? (found|reported)/i);
    }
  });
});

describe('explainStatus', () => {
  it('reads 401 as the token, not the address', () => {
    expect(explainStatus(401).message).toMatch(/token/i);
    expect(explainStatus(401).fixAddress).toBe(false);
  });

  it('reads 404 as the address, not the token', () => {
    expect(explainStatus(404).fixAddress).toBe(true);
  });
});

describe('missingCapabilities', () => {
  it('is silent when the host can do what is needed', () => {
    expect(missingCapabilities(['net.lan', 'watch.value'])).toEqual([]);
  });

  it('names what is missing so the user is told to update, not shown an empty screen', () => {
    expect(missingCapabilities(['watch.value'])).toEqual(['net.lan']);
  });

  it('treats a host that reports NOTHING as missing everything', () => {
    // An OS old enough to predate the capability list is exactly the OS that
    // lacks these. Absent means missing, and saying so beats hoping.
    expect(missingCapabilities(undefined)).toEqual(['net.lan']);
    expect(missingCapabilities([])).toEqual(['net.lan']);
  });

  it('checks the watch capabilities separately, since watching is optional', () => {
    // A host that can read but not watch still gives a working dashboard; only
    // the background half has to be hidden.
    expect(missingCapabilities(['net.lan'], WATCH_CAPABILITIES)).toEqual(['watch.background', 'watch.value']);
    expect(missingCapabilities(['net.lan'], REQUIRED_CAPABILITIES)).toEqual([]);
  });
});
