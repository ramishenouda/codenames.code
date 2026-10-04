const CLUE_PATTERN = /^[a-z0-9]+(?:[-'][a-z0-9]+)*$/i;

export function otherTeam(team) {
  return team === 'red' ? 'blue' : 'red';
}

export function teamName(team) {
  return team === 'red' ? 'Red' : 'Blue';
}

function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(word) {
  return String(word).trim().toLowerCase();
}

function remaining(cards, color) {
  return cards.filter((card) => card.color === color && !card.revealed).length;
}

export function createGame(dictionary, random = Math.random) {
  if (!Array.isArray(dictionary) || dictionary.length < 25) {
    throw new Error('Need at least 25 words');
  }
  const startingTeam = random() < 0.5 ? 'red' : 'blue';
  const colors = shuffle(
    [
      ...Array(9).fill(startingTeam),
      ...Array(8).fill(otherTeam(startingTeam)),
      ...Array(7).fill('neutral'),
      'assassin',
    ],
    random,
  );
  const words = shuffle(dictionary, random).slice(0, 25);
  const artDecks = Object.fromEntries(
    ['red', 'blue', 'neutral', 'assassin'].map((color) => [
      color,
      shuffle(Array.from({ length: 20 }, (_, index) => index), random),
    ]),
  );
  const artCursor = { red: 0, blue: 0, neutral: 0, assassin: 0 };
  return {
    phase: 'clue',
    startingTeam,
    turn: startingTeam,
    cards: words.map((word, index) => {
      const color = colors[index];
      const art = artDecks[color][artCursor[color]];
      artCursor[color] += 1;
      return {
        word,
        color,
        revealed: false,
        art,
      };
    }),
    clue: null,
    guessesRemaining: null,
    winner: null,
    log: [{ kind: 'system', text: `${teamName(startingTeam)} opens the round.` }],
  };
}

export function createGameFromCards(cards, {
  turn = 'red',
  phase = 'clue',
  clue = null,
  guessesRemaining = null,
} = {}) {
  return {
    phase,
    startingTeam: turn,
    turn,
    cards,
    clue,
    guessesRemaining,
    winner: null,
    log: [],
  };
}

export function giveClue(game, input) {
  if (game.phase !== 'clue') {
    return { ok: false, error: 'It is not time for a clue.' };
  }
  const word = String(input?.word ?? '').trim();
  if (!word || /\s/.test(word) || !CLUE_PATTERN.test(word)) {
    return { ok: false, error: 'A clue must be a single word.' };
  }
  const normalized = normalize(word);
  const clash = game.cards.some((card) => normalize(card.word) === normalized);
  if (clash) {
    return { ok: false, error: 'That clue matches a word on the table.' };
  }

  let count = input.count;
  let guessesRemaining = null;
  let label = '∞';
  if (count === 'unlimited' || count === '∞') {
    count = 'unlimited';
  } else {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 0 || n > 9) {
      return { ok: false, error: 'Count must be 0–9 or unlimited.' };
    }
    count = n;
    // The team may take one guess beyond the number in the clue.
    guessesRemaining = n + 1;
    label = String(n);
  }

  const shown = word.toUpperCase();
  return {
    ok: true,
    game: {
      ...game,
      phase: 'guess',
      clue: { word: shown, count },
      guessesRemaining,
      log: [
        ...game.log,
        { kind: 'clue', team: game.turn, text: `${teamName(game.turn)} clue: ${shown} ${label}` },
      ],
    },
  };
}

function finish(game, cards, winner, text) {
  return {
    ok: true,
    game: {
      ...game,
      cards,
      phase: 'gameover',
      winner,
      clue: game.clue,
      guessesRemaining: null,
      log: [...game.log, { kind: 'guess', team: game.turn, text }],
    },
  };
}

function passTurn(game, cards, text) {
  const next = otherTeam(game.turn);
  return {
    ok: true,
    game: {
      ...game,
      cards,
      turn: next,
      phase: 'clue',
      clue: null,
      guessesRemaining: null,
      log: [...game.log, { kind: 'guess', team: game.turn, text }],
    },
  };
}

export function guessCard(game, index) {
  if (game.phase !== 'guess') {
    return { ok: false, error: 'It is not time to guess.' };
  }
  if (!Number.isInteger(index) || index < 0 || index >= game.cards.length) {
    return { ok: false, error: 'That card is not on the board.' };
  }
  const card = game.cards[index];
  if (card.revealed) {
    return { ok: false, error: 'That card is already revealed.' };
  }

  const cards = game.cards.map((entry, i) => (
    i === index ? { ...entry, revealed: true } : entry
  ));
  const side = teamName(game.turn);
  const word = card.word.toUpperCase();

  if (card.color === 'assassin') {
    const winner = otherTeam(game.turn);
    return finish(
      game,
      cards,
      winner,
      `${side} revealed ${word} — the assassin. ${teamName(winner)} wins.`,
    );
  }

  if ((card.color === 'red' || card.color === 'blue') && remaining(cards, card.color) === 0) {
    return finish(
      game,
      cards,
      card.color,
      `${side} revealed ${word}. ${teamName(card.color)} found every agent.`,
    );
  }

  if (card.color === game.turn) {
    const nextGuesses = game.guessesRemaining == null ? null : game.guessesRemaining - 1;
    if (nextGuesses === 0) {
      const next = otherTeam(game.turn);
      return {
        ok: true,
        game: {
          ...game,
          cards,
          turn: next,
          phase: 'clue',
          clue: null,
          guessesRemaining: null,
          log: [
            ...game.log,
            { kind: 'guess', team: game.turn, text: `${side} revealed ${word}. No guesses left. ${teamName(next)}'s turn.` },
          ],
        },
      };
    }
    return {
      ok: true,
      game: {
        ...game,
        cards,
        guessesRemaining: nextGuesses,
        log: [...game.log, { kind: 'guess', team: game.turn, text: `${side} revealed ${word}.` }],
      },
    };
  }

  const why = card.color === 'neutral'
    ? 'a bystander'
    : `${card.color} agent`;
  const next = otherTeam(game.turn);
  return passTurn(game, cards, `${side} revealed ${word} — ${why}. ${teamName(next)}'s turn.`);
}

export function endTurn(game) {
  if (game.phase !== 'guess') {
    return { ok: false, error: 'You can only end a turn while guessing.' };
  }
  const next = otherTeam(game.turn);
  return {
    ok: true,
    game: {
      ...game,
      turn: next,
      phase: 'clue',
      clue: null,
      guessesRemaining: null,
      log: [
        ...game.log,
        { kind: 'system', text: `${teamName(game.turn)} ended the turn. ${teamName(next)}'s clue.` },
      ],
    },
  };
}
