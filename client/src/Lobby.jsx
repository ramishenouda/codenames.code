import { useState } from 'react';
import { paintingUrl } from './art.js';
import ChatPanel from './ChatPanel.jsx';
import Frame from './Frame.jsx';

function TeamColumn({ team, room, onSit }) {
  const members = room.players.filter((player) => player.team === team);
  const spymaster = members.find((player) => player.role === 'spymaster');
  const operatives = members.filter((player) => player.role === 'operative');
  const mine = room.yourTeam === team ? room.yourRole : null;
  const label = team === 'red' ? 'Red' : 'Blue';

  return (
    <section className={`team-block ${team}`}>
      <div className="team-head">
        <span
          className="team-thumb"
          style={{ backgroundImage: `url(${paintingUrl(team, team === 'red' ? 0 : 1)})` }}
          aria-hidden="true"
        />
        <h3>{label}</h3>
      </div>
      <Seat
        name={spymaster?.name}
        role="Spymaster"
        host={spymaster?.id === room.hostId}
        you={spymaster?.id === room.youId}
      />
      {operatives.length === 0 && <Seat role="Operative" />}
      {operatives.map((player) => (
        <Seat
          key={player.id}
          name={player.name}
          role="Operative"
          host={player.id === room.hostId}
          you={player.id === room.youId}
        />
      ))}
      {room.actions.sit && (
        <div className="seat-actions">
          <button
            type="button"
            aria-pressed={mine === 'spymaster'}
            onClick={() => onSit(team, 'spymaster')}
          >
            {mine === 'spymaster' ? 'You are spymaster' : 'Sit as spymaster'}
          </button>
          <button
            type="button"
            aria-pressed={mine === 'operative'}
            onClick={() => onSit(team, 'operative')}
          >
            {mine === 'operative' ? 'You are operative' : 'Sit as operative'}
          </button>
        </div>
      )}
    </section>
  );
}

function Seat({ name, role, host = false, you = false }) {
  return (
    <p className={`seat-row${name ? '' : ' empty'}`}>
      <span>{name || 'Empty seat'}</span>
      <em>
        {role}
        {host ? ' · Host' : ''}
        {you ? ' · You' : ''}
      </em>
    </p>
  );
}

export default function Lobby({ room, error, onSit, onRandomize, onStart, onChat, onLeave }) {
  const [copied, setCopied] = useState(false);
  const waiting = room.players.filter((player) => !player.team);
  const host = room.youId === room.hostId;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="desk lobby-desk">
      <Frame className="lobby-card">
        <h2>Lobby</h2>
        <div className="rule" aria-hidden="true"><span /></div>
        {error && <p className="banner" role="alert">{error}</p>}
        <div className="code-row">
          <p className="code-plaque">
            <span>Room code</span>
            <strong>{room.code}</strong>
          </p>
          <button type="button" className="back copy-btn" onClick={copyCode}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="teams">
          <TeamColumn team="red" room={room} onSit={onSit} />
          <TeamColumn team="blue" room={room} onSit={onSit} />
        </div>
        {waiting.length > 0 && (
          <p className="waiting">
            Still choosing a seat: {waiting.map((player) => player.name).join(', ')}
          </p>
        )}
        <div className="lobby-actions">
          {host ? (
            <>
              <button type="button" className="back" disabled={!room.actions.randomize} onClick={onRandomize}>
                Randomize
              </button>
              <button type="button" className="primary" disabled={!room.actions.start} onClick={onStart}>
                Start game
              </button>
            </>
          ) : (
            <p className="waiting span-all">Waiting for the host to deal.</p>
          )}
        </div>
        {host && !room.actions.start && <p className="hint">{room.startHint}</p>}
        <ChatPanel messages={room.chat} onSend={onChat} />
        <div className="leave-row">
          <button type="button" className="back" onClick={onLeave}>Leave lobby</button>
        </div>
      </Frame>
    </main>
  );
}
