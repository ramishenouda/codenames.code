import { useState } from 'react';
import { hiddenPainting, paintingUrl } from './art.js';
import ChatPanel from './ChatPanel.jsx';
import Frame from './Frame.jsx';

const TAGS = {
  red: 'red agent',
  blue: 'blue agent',
  neutral: 'bystander',
  assassin: 'assassin',
};

function cardClass(card) {
  if (!card.color) return 'card';
  if (card.revealed) return `card revealed revealed-${card.color}`;
  return `card key key-${card.color}`;
}

function Rail({ team, room }) {
  const members = room.players.filter((player) => player.team === team);
  const active = room.turn === team && room.phase !== 'gameover';
  const label = team === 'red' ? 'Red' : 'Blue';

  return (
    <section className={`rail ${team}${active ? ' active' : ''}`}>
      <header>
        <h2>{label}</h2>
        <strong className="badge">{room.counts[team].left}</strong>
      </header>
      <p>{room.counts[team].left} left of {room.counts[team].total}</p>
      <ul>
        {members.map((player) => (
          <li key={player.id}>
            <span className={player.connected ? 'dot on' : 'dot'} />
            <span>
              {player.name}
              {player.id === room.youId ? ' · you' : ''}
            </span>
            <em>
              {player.role === 'spymaster' ? 'Spymaster' : 'Operative'}
              {player.id === room.hostId ? ' · Host' : ''}
            </em>
          </li>
        ))}
        {members.length === 0 && <li className="quiet">No one seated</li>}
      </ul>
    </section>
  );
}

export default function Board({
  room,
  error,
  onClue,
  onGuess,
  onEndTurn,
  onPlayAgain,
  onChat,
  onLeave,
}) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState(1);
  const teamLabel = room.turn === 'red' ? 'Red' : 'Blue';
  const clueLabel = room.clue
    ? `${room.clue.word} ${room.clue.count === 'unlimited' ? '∞' : room.clue.count}`
    : '';
  const yours = room.yourTeam === room.turn;

  function submitClue(event) {
    event.preventDefault();
    onClue(word, count);
    setWord('');
  }

  let status = 'Choosing a clue';
  if (room.phase === 'guess') {
    const left = room.guessesRemaining == null
      ? 'Unlimited guesses'
      : `${room.guessesRemaining} guess${room.guessesRemaining === 1 ? '' : 'es'} left`;
    status = left;
  }
  if (room.phase === 'gameover') {
    status = room.winner === 'red' ? 'Red wins' : 'Blue wins';
  }

  const turnTitle = room.phase === 'gameover'
    ? 'Game over'
    : yours
      ? 'Your turn'
      : `${teamLabel}'s turn`;

  return (
    <main className="board-desk">
      {error && <p className="banner desk-banner" role="alert">{error}</p>}
      <div className="board-layout">
        <aside className="rails">
          <Rail team="red" room={room} />
          <Rail team="blue" room={room} />
        </aside>
        <Frame className="mat">
          {room.clue && room.phase !== 'gameover' && (
            <p className="clue-line">
              <span>Clue</span>
              {clueLabel}
            </p>
          )}
          <div className="grid">
            {room.board.map((card, index) => {
              const url = card.color
                ? paintingUrl(card.color, card.art)
                : hiddenPainting(index);
              return (
                <button
                  key={`${card.word}-${index}`}
                  type="button"
                  className={`${cardClass(card)} has-art${room.actions.guess && !card.revealed ? ' live' : ''}`}
                  style={{ '--card-art': `url(${url})` }}
                  onClick={() => {
                    if (room.actions.guess && !card.revealed) onGuess(index);
                  }}
                >
                  <span className="card-face" />
                  <span className="card-caption">
                    <span className="card-word">{card.word}</span>
                    {card.color && <span className="card-tag">{TAGS[card.color]}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </Frame>
        <aside className="action-rail">
          <section className={`slip turn-slip ${room.phase === 'gameover' ? room.winner : room.turn}`}>
            <p className="turn-kicker">{turnTitle}</p>
            <p className="status">{status}</p>
            {clueLabel && room.phase !== 'gameover' && <p className="clue-chip">{clueLabel}</p>}
            <p className="code-chip">Room {room.code}</p>
          </section>
          {room.actions.clue && (
            <form className="slip clue-form" onSubmit={submitClue}>
              <h2>Give a clue</h2>
              <label>
                <span>One word</span>
                <input
                  value={word}
                  maxLength={24}
                  spellCheck={false}
                  onChange={(event) => setWord(event.target.value)}
                />
              </label>
              <div className="count-row" role="group" aria-label="Number of cards">
                {Array.from({ length: 10 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={count === n}
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={count === 'unlimited'}
                  onClick={() => setCount('unlimited')}
                >
                  ∞
                </button>
              </div>
              <button type="submit" className="primary">Give clue</button>
              <p className="hint">Your team may make one extra guess. A miss ends the turn.</p>
            </form>
          )}
          {(room.actions.guess || (room.actions.endTurn && !room.actions.guess)) && (
            <div className="slip guess-row">
              {room.actions.guess && <p>Touch a card. Stop when the clue runs out.</p>}
              <button type="button" className="back" onClick={onEndTurn}>End turn</button>
            </div>
          )}
          {room.phase === 'gameover' && (
            <div className={`slip result ${room.winner}`}>
              <h2>{room.winner === 'red' ? 'Red wins' : 'Blue wins'}</h2>
              {room.actions.playAgain
                ? <button type="button" className="primary" onClick={onPlayAgain}>Deal again</button>
                : <p>Waiting for the host to deal again.</p>}
            </div>
          )}
          <section className="slip log">
            <h2>Round</h2>
            <ol>
              {room.log.map((entry, index) => (
                <li key={`${entry.text}-${index}`} className={entry.team ?? entry.kind}>{entry.text}</li>
              ))}
            </ol>
          </section>
          <ChatPanel className="slip" messages={room.chat} onSend={onChat} />
          <button type="button" className="back leave-btn" onClick={onLeave}>Leave</button>
        </aside>
      </div>
    </main>
  );
}
