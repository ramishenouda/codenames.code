import { useEffect, useState } from 'react';
import { hiddenPainting, paintingUrl } from './art.js';
import ChatPanel from './ChatPanel.jsx';
import Frame, { Brand } from './Frame.jsx';

const TAGS = {
  red: 'red agent',
  blue: 'blue agent',
  neutral: 'bystander',
  assassin: 'assassin',
};

function CardButton({ card, index, spy, gameover, canGuess, onGuess }) {
  const hidden = hiddenPainting(index);
  const known = card.color ? paintingUrl(card.color, card.art) : hidden;
  const open = card.revealed || (gameover && card.color && !spy);
  const frontUrl = spy && card.color ? known : hidden;
  const label = card.color ? `${card.word} ${TAGS[card.color]}` : card.word;

  return (
    <button
      type="button"
      className={`card${open ? ' open' : ''}${canGuess && !card.revealed ? ' live' : ''}`}
      style={{
        '--i': index,
        '--flip-delay': gameover && !card.revealed ? `${index * 32}ms` : '0ms',
      }}
      aria-label={label}
      onClick={() => {
        if (canGuess && !card.revealed) onGuess(index);
      }}
    >
      <span className="card-inner">
        <span className={`card-side front${spy && card.color ? ` tone-${card.color}` : ''}`}>
          <span className="card-face" style={{ '--card-art': `url(${frontUrl})` }} />
          <span className="card-caption">
            <span className="card-word">{card.word}</span>
            {spy && card.color && <span className="card-tag">{TAGS[card.color]}</span>}
          </span>
        </span>
        <span className={`card-side back${card.color ? ` tone-${card.color}` : ''}`}>
          <span className="card-face" style={{ '--card-art': `url(${known})` }} />
          <span className="card-caption">
            <span className="card-word">{card.word}</span>
            {card.color && <span className="card-tag">{TAGS[card.color]}</span>}
          </span>
        </span>
      </span>
    </button>
  );
}

function Rail({ team, room }) {
  const members = room.players.filter((player) => player.team === team);
  const active = room.turn === team && room.phase !== 'gameover';
  const label = team === 'red' ? 'Red' : 'Blue';

  return (
    <section className={`rail ${team}${active ? ' active' : ''}`}>
      <header>
        <h2>{label}</h2>
        <strong key={room.counts[team].left} className="badge">{room.counts[team].left}</strong>
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
  const spy = room.yourRole === 'spymaster';
  const [flipReady, setFlipReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setFlipReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
          <Brand />
          <Rail team="red" room={room} />
          <Rail team="blue" room={room} />
        </aside>
        <Frame className="mat" brand={false}>
          {room.clue && room.phase !== 'gameover' && (
            <p key={clueLabel} className="clue-line">
              <span>Clue</span>
              {clueLabel}
            </p>
          )}
          <div className={`grid${flipReady ? ' flip-ready' : ''}`}>
            {room.board.map((card, index) => (
              <CardButton
                key={`${card.word}-${index}`}
                card={card}
                index={index}
                spy={spy}
                gameover={room.phase === 'gameover'}
                canGuess={room.actions.guess}
                onGuess={onGuess}
              />
            ))}
          </div>
        </Frame>
        <aside className="action-rail">
          <section
            key={`${room.turn}-${room.phase}`}
            className={`slip turn-slip ${room.phase === 'gameover' ? room.winner : room.turn}`}
          >
            <p className="turn-kicker">{turnTitle}</p>
            <p className="status">{status}</p>
            {clueLabel && room.phase !== 'gameover' && <p key={clueLabel} className="clue-chip">{clueLabel}</p>}
            <p className="code-chip">Room {room.code}</p>
          </section>
          {room.actions.clue && (
            <form className="slip clue-form" onSubmit={submitClue}>
              <h2>Give a clue</h2>
              <label className="field">
                <span className="field-label">One word</span>
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
              <button type="button" onClick={onEndTurn}>End turn</button>
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
          <button type="button" className="quiet-btn leave-btn" onClick={onLeave}>Leave game</button>
        </aside>
      </div>
    </main>
  );
}
