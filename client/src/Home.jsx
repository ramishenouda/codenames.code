import { useState } from 'react';
import Frame, { Glyph } from './Frame.jsx';
import { loadName } from './socket.js';

export default function Home({ online, error, initialCode, onCreate, onJoin }) {
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(initialCode);

  return (
    <main className="desk">
      <Frame className="home-card">
        <h2>Create a room</h2>
        <div className="rule" aria-hidden="true"><span /></div>
        {!online && <p className="banner">Connecting to the table…</p>}
        {error && <p className="banner" role="alert">{error}</p>}
        <label className="field">
          <span>Your name</span>
          <span className="inset">
            <Glyph>
              <circle cx="12" cy="8" r="3.2" fill="currentColor" />
              <path fill="currentColor" d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" />
            </Glyph>
            <input
              value={name}
              maxLength={16}
              autoComplete="nickname"
              placeholder="Explorer"
              onChange={(event) => setName(event.target.value)}
            />
          </span>
        </label>
        <label className="field">
          <span>Room code</span>
          <span className="inset">
            <Glyph>
              <circle cx="8" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="8" cy="12" r="1.05" fill="currentColor" />
              <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M11 12h8M16.2 12v2.4M19 12v2.4" />
            </Glyph>
            <input
              value={code}
              maxLength={4}
              spellCheck={false}
              placeholder="A7K9"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </span>
        </label>
        <div className="home-actions">
          <button type="button" className="primary" onClick={() => onCreate(name)} disabled={!online}>
            Create a room
          </button>
          <button
            type="button"
            className="back"
            onClick={() => onJoin(name, code)}
            disabled={!online || code.length < 4}
          >
            Join with code
          </button>
        </div>
      </Frame>
    </main>
  );
}
