import { useState } from 'react';
import { paintingUrl } from './art.js';
import Frame, { Glyph } from './Frame.jsx';
import { loadName } from './socket.js';

const HERO = [
  ['red', 0],
  ['neutral', 7],
  ['blue', 0],
];

export default function Home({ online, error, initialCode, onCreate, onJoin }) {
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(initialCode);

  return (
    <main className="desk">
      <Frame className="home-card">
        <div className="hero" aria-hidden="true">
          {HERO.map(([color, index]) => (
            <span
              key={color}
              className={`hero-card ${color}`}
              style={{ backgroundImage: `url(${paintingUrl(color, index)})` }}
            />
          ))}
        </div>
        <h2>Start a game</h2>
        <p className="lede">
          Free online Codenames — create a room, or join one with a code, and play in real time.
        </p>
        {!online && <p className="banner">Connecting to the table…</p>}
        {error && <p className="banner" role="alert">{error}</p>}
        <label className="field">
          <span className="field-label">Your name</span>
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
        <button type="button" className="primary wide" onClick={() => onCreate(name)} disabled={!online}>
          Create a room
        </button>
        <div className="divider"><span>or join a room</span></div>
        <div className="join-row">
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
              aria-label="Room code"
              placeholder="Room code"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </span>
          <button
            type="button"
            onClick={() => onJoin(name, code)}
            disabled={!online || code.length < 4}
          >
            Join
          </button>
        </div>
        <a className="quiet-link stats-link" href="/stats">Statistics</a>
        <section className="seo-copy">
          <h2>How online Codenames works</h2>
          <p>
            Sit as a spymaster or operative. Spymasters give one-word clues;
            operatives flip cards to find their agents. Bystanders end the turn.
            The assassin ends the game.
          </p>
        </section>
      </Frame>
    </main>
  );
}
