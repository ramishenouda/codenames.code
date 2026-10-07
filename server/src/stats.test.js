import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRoom,
  joinRoom,
  listRooms,
  resetRooms,
  sit,
  startGame,
  submitClue,
  submitGuess,
} from './rooms.js';
import { publicStats } from './stats.js';

test.afterEach(() => {
  resetRooms();
});

test('stats count a dealt game, a clue, and a finished assassin', () => {
  const host = createRoom('Ava');
  const bo = joinRoom(host.code, 'Bo');
  const cy = joinRoom(host.code, 'Cy');
  const dee = joinRoom(host.code, 'Dee');
  sit(host.code, host.playerId, 'red', 'spymaster');
  sit(host.code, bo.playerId, 'red', 'operative');
  sit(host.code, cy.playerId, 'blue', 'spymaster');
  sit(host.code, dee.playerId, 'blue', 'operative');
  const started = startGame(host.code, host.playerId);
  assert.equal(started.ok, true);

  const game = started.room.game;
  const spy = game.turn === 'red' ? host.playerId : cy.playerId;
  const operative = game.turn === 'red' ? bo.playerId : dee.playerId;
  const clue = submitClue(host.code, spy, 'quartz', 1);
  assert.equal(clue.error, undefined, clue.error);

  const assassin = game.cards.findIndex((card) => card.color === 'assassin');
  const guessed = submitGuess(host.code, operative, assassin);
  assert.equal(guessed.room.game.phase, 'gameover');

  const stats = publicStats(listRooms());
  assert.equal(stats.totals.rooms, 1);
  assert.equal(stats.totals.games, 1);
  assert.equal(stats.totals.clues, 1);
  assert.equal(stats.totals.guesses, 1);
  assert.equal(stats.totals.assassins, 1);
  assert.equal(stats.totals.finished, 1);
  assert.equal(stats.totals.assassinWins, 1);
  assert.equal(stats.live.finished, 1);
  assert.equal(JSON.stringify(stats).includes(game.cards[assassin].word), false);
});
