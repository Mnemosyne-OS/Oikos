/**
 * Setup — the address of the box and the token to read it.
 *
 * Two fields and one sentence about where the token is kept. That sentence is
 * not decoration: the token goes into the cartridge's own settings blob, which
 * is a plain local file and not a vault, and a person handing over a credential
 * is owed the truth about where it lands.
 */
import { useState } from 'react';
import { normalizeBaseUrl, tokenLooksSendable } from '../lib/connection';
import * as s from '../styles';

interface Props {
  initialUrl?: string;
  initialToken?: string;
  busy: boolean;
  onConnect: (baseUrl: string, token: string) => void;
}

export default function Setup({ initialUrl = '', initialToken = '', busy, onConnect }: Props): JSX.Element {
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState(initialToken);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (): void => {
    const normalized = normalizeBaseUrl(url);
    if (!normalized.ok) { setProblem(normalized.reason); return; }
    if (!tokenLooksSendable(token)) {
      setProblem('Paste a long-lived access token, on a single line.');
      return;
    }
    setProblem(null);
    onConnect(normalized.url, token.trim());
  };

  return (
    <div style={s.panel}>
      <p style={s.groupLabel}>Your Home Assistant</p>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={s.tileName}>Address on your network</span>
        <input
          style={s.input}
          value={url}
          placeholder="192.168.1.8:8123"
          aria-label="Home Assistant address"
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={s.tileName}>Long-lived access token</span>
        <input
          style={s.input}
          value={token}
          type="password"
          placeholder="eyJhbGciOi…"
          aria-label="Home Assistant token"
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        />
      </label>

      <p style={{ ...s.lede, fontSize: '13px' }}>
        Create one in Home Assistant under your profile, at the bottom of the page.
        It is kept in this cartridge&rsquo;s settings file on your machine, in plain
        text and not in a vault. You can revoke it from Home Assistant at any time,
        which is the surest way to take it back.
      </p>

      {problem && <p style={{ ...s.lede, color: 'var(--accent-red, #a8443c)' }}>{problem}</p>}

      <div>
        <button style={s.button} onClick={submit} disabled={busy}>
          {busy ? 'Asking…' : 'Connect'}
        </button>
      </div>

      <p style={{ ...s.lede, fontSize: '13px' }}>
        Mnemosyne will ask you before Oikos touches this device, and again for any
        other one. Oikos can only read: it cannot switch anything on or off.
      </p>
    </div>
  );
}
