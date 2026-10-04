import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGame,
  createGameFromCards,
  endTurn,
  giveClue,
  guessCard,
} from './game.js';
import { WORDS } from './words.js';

function card(word, color, revealed = false) {
  return { word, color, revealed };
}

test('a new board has 9, 8, 7, and one assassin', () => {
  const game = createGame(WORDS, () => 0);
  assert.equal(game.cards.length, 25);
  assert.equal(game.phase, 'clue');
  assert.equal(game.turn, 'red');
  assert.equal(game.cards.filter((entry) => entry.color === 'red').length, 9);
  assert.equal(game.cards.filter((entry) => entry.color === 'blue').length, 8);
  assert.equal(game.cards.filter((entry) => entry.color === 'neutral').length, 7);
  assert.equal(game.cards.filter((entry) => entry.color === 'assassin').length, 1);
  assert.equal(new Set(game.cards.map((entry) => entry.word)).size, 25);
});

test('the other starter gets the nine cards', () => {
  const game = createGame(WORDS, () => 0.9);
  assert.equal(game.startingTeam, 'blue');
  assert.equal(game.cards.filter((entry) => entry.color === 'blue').length, 9);
  assert.equal(game.cards.filter((entry) => entry.color === 'red').length, 8);
});

test('clues are one word and cannot match the table', () => {
  const game = createGameFromCards([
    card('eagle', 'red'),
    card('moon', 'blue'),
  ]);
  assert.equal(giveClue(game, { word: 'sea bird', count: 1 }).ok, false);
  assert.equal(giveClue(game, { word: 'eagle', count: 1 }).ok, false);
  assert.equal(giveClue(game, { word: 'EAGLE', count: 1 }).ok, false);
  const given = giveClue(game, { word: 'orbit', count: 2 });
  assert.equal(given.ok, true);
  assert.equal(given.game.phase, 'guess');
  assert.equal(given.game.clue.word, 'ORBIT');
  assert.equal(given.game.guessesRemaining, 3);
  const unlimited = giveClue(game, { word: 'orbit', count: 'unlimited' });
  assert.equal(unlimited.game.guessesRemaining, null);
});

test('a correct guess stays, and the extra guess ends the turn', () => {
  let game = createGameFromCards([
    card('eagle', 'red'),
    card('moon', 'red'),
    card('nest', 'red'),
    card('fish', 'blue'),
  ], { phase: 'guess', guessesRemaining: 2, clue: { word: 'SKY', count: 1 } });
  let next = guessCard(game, 0);
  assert.equal(next.game.phase, 'guess');
  assert.equal(next.game.turn, 'red');
  assert.equal(next.game.guessesRemaining, 1);
  next = guessCard(next.game, 1);
  assert.equal(next.game.phase, 'clue');
  assert.equal(next.game.turn, 'blue');
  assert.equal(next.game.cards[1].revealed, true);
});

test('an opponent card and a bystander both end the turn', () => {
  const game = createGameFromCards([
    card('fish', 'blue'),
    card('sand', 'neutral'),
    card('wave', 'blue'),
  ], { phase: 'guess', guessesRemaining: 3, clue: { word: 'WATER', count: 2 } });
  const opponent = guessCard(game, 0);
  assert.equal(opponent.game.turn, 'blue');
  assert.equal(opponent.game.phase, 'clue');
  assert.equal(opponent.game.cards[0].color, 'blue');
  const bystander = guessCard(game, 1);
  assert.equal(bystander.game.turn, 'blue');
  assert.match(bystander.game.log.at(-1).text, /bystander/);
});

test('the assassin wins the game for the other team', () => {
  const game = createGameFromCards([
    card('ghost', 'assassin'),
    card('eagle', 'red'),
  ], { phase: 'guess', guessesRemaining: 2, clue: { word: 'NIGHT', count: 1 } });
  const next = guessCard(game, 0);
  assert.equal(next.game.phase, 'gameover');
  assert.equal(next.game.winner, 'blue');
});

test('revealing the last agent wins, including the opponent last agent', () => {
  const own = createGameFromCards([
    card('eagle', 'red'),
    card('fish', 'blue'),
  ], { phase: 'guess', guessesRemaining: 1, clue: { word: 'BIRD', count: 0 } });
  assert.equal(guessCard(own, 0).game.winner, 'red');

  const theirs = createGameFromCards([
    card('fish', 'blue', true),
    card('wave', 'blue'),
    card('eagle', 'red'),
  ], { phase: 'guess', guessesRemaining: 2, clue: { word: 'BIRD', count: 1 } });
  const next = guessCard(theirs, 1);
  assert.equal(next.game.winner, 'blue');
});

test('ending the turn passes the clue', () => {
  const game = createGameFromCards([
    card('eagle', 'red'),
  ], { phase: 'guess', guessesRemaining: 2, clue: { word: 'BIRD', count: 1 } });
  const next = endTurn(game);
  assert.equal(next.game.turn, 'blue');
  assert.equal(next.game.phase, 'clue');
  assert.equal(next.game.clue, null);
  assert.equal(endTurn(next.game).ok, false);
});
