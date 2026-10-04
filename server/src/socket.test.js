import assert from 'node:assert/strict';
import test from 'node:test';
import { io as ioClient } from 'socket.io-client';
import { start } from './index.js';
import { maskRoom, resetRooms } from './rooms.js';

function card(word, color, revealed = false) {
  return { word, color, revealed };
}

test('operatives only learn a color after the card is revealed', () => {
  const room = {
    code: 'TEST',
    hostId: 'spy',
    players: [
      { id: 'spy', name: 'Ava', team: 'red', role: 'spymaster', connected: true },
      { id: 'op', name: 'Bo', team: 'red', role: 'operative', connected: true },
    ],
    game: {
      phase: 'guess',
      startingTeam: 'red',
      turn: 'red',
      clue: { word: 'SKY', count: 1 },
      guessesRemaining: 2,
      winner: null,
      cards: [
        card('eagle', 'red', true),
        card('ghost', 'assassin', false),
        card('fish', 'blue', false),
      ],
      log: [],
    },
    chat: [],
  };

  const spy = maskRoom(room, 'spy');
  const op = maskRoom(room, 'op');
  assert.equal(spy.board[1].color, 'assassin');
  assert.equal(op.board[0].color, 'red');
  assert.equal(op.board[1].color, null);
  assert.equal(op.board[2].color, null);
  assert.equal(JSON.stringify(op.board).includes('assassin'), false);
  assert.equal(JSON.stringify(op.board).includes('blue'), false);

  room.game = { ...room.game, phase: 'gameover', winner: 'red' };
  const ended = maskRoom(room, 'op');
  assert.equal(ended.board[1].color, 'assassin');
  assert.equal(ended.board[2].color, 'blue');
});

function track(socket) {
  const state = { room: null };
  socket.on('room', (room) => {
    state.room = room;
  });
  return state;
}

function waitUntil(client, predicate) {
  if (client.state.room && predicate(client.state.room)) {
    return Promise.resolve(client.state.room);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.socket.off('room', onRoom);
      reject(new Error('timed out waiting for a room update'));
    }, 2000);
    function onRoom(room) {
      if (!predicate(room)) return;
      clearTimeout(timer);
      client.socket.off('room', onRoom);
      resolve(room);
    }
    client.socket.on('room', onRoom);
  });
}

function emit(socket, event, payload = {}) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}

async function connect(port) {
  const socket = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return { socket, state: track(socket) };
}

test('a full room hides the key from operatives and plays a round', { timeout: 8000 }, async () => {
  resetRooms();
  const server = await start(0);
  const clients = [];
  try {
    const host = await connect(server.port);
    const redOp = await connect(server.port);
    const blueSpy = await connect(server.port);
    const blueOp = await connect(server.port);
    clients.push(host, redOp, blueSpy, blueOp);

    const createdRoom = waitUntil(host, (room) => room.phase === 'lobby');
    const created = await emit(host.socket, 'createRoom', { name: 'Ava' });
    assert.equal(created.error, undefined);
    await createdRoom;

    async function join(client, name) {
      const pending = waitUntil(client, (room) => room.players.some((player) => player.name === name));
      const joined = await emit(client.socket, 'joinRoom', { code: created.code, name });
      assert.equal(joined.error, undefined, joined.error);
      await pending;
    }
    await join(redOp, 'Bo');
    await join(blueSpy, 'Cy');
    await join(blueOp, 'Dee');

    async function sit(client, team, role) {
      const pending = waitUntil(client, (room) => room.yourTeam === team && room.yourRole === role);
      const sat = await emit(client.socket, 'sit', { team, role });
      assert.equal(sat.error, undefined, sat.error);
      await pending;
    }
    await sit(host, 'red', 'spymaster');
    await sit(redOp, 'red', 'operative');
    await sit(blueSpy, 'blue', 'spymaster');
    await sit(blueOp, 'blue', 'operative');

    const blocked = await emit(redOp.socket, 'startGame', {});
    assert.match(blocked.error, /host/);

    const startedSpy = waitUntil(host, (room) => room.phase === 'clue' && room.board);
    const startedOp = waitUntil(redOp, (room) => room.phase === 'clue' && room.board);
    const startAck = await emit(host.socket, 'startGame', {});
    assert.equal(startAck.error, undefined, startAck.error);
    const spyRoom = await startedSpy;
    const opRoom = await startedOp;

    assert.equal(spyRoom.phase, 'clue');
    assert.equal(spyRoom.board.filter((entry) => entry.color === 'assassin').length, 1);
    for (const entry of opRoom.board) {
      assert.equal(entry.color, null);
      assert.equal(entry.revealed, false);
    }
    assert.equal(JSON.stringify(opRoom).includes('assassin'), false);

    const turn = spyRoom.turn;
    const clueGiver = turn === 'red' ? host : blueSpy;
    const guesser = turn === 'red' ? redOp : blueOp;
    const ownColor = turn;
    const ownIndex = spyRoom.board.findIndex((entry) => entry.color === ownColor);
    const foeIndex = spyRoom.board.findIndex((entry) => entry.color !== ownColor && entry.color !== 'assassin' && entry.color !== 'neutral');
    const assassinIndex = spyRoom.board.findIndex((entry) => entry.color === 'assassin');

    const clueDenied = await emit(guesser.socket, 'giveClue', { word: 'synthetic', count: 1 });
    assert.match(clueDenied.error, /spymaster/);

    const clued = waitUntil(clueGiver, (room) => room.phase === 'guess' && room.clue?.word === 'SYNTHETIC');
    const clueAck = await emit(clueGiver.socket, 'giveClue', { word: 'synthetic', count: 'unlimited' });
    assert.equal(clueAck.error, undefined, clueAck.error);
    await clued;

    const guessed = waitUntil(guesser, (room) => room.board[ownIndex].revealed);
    const guessAck = await emit(guesser.socket, 'guess', { index: ownIndex });
    assert.equal(guessAck.error, undefined, guessAck.error);
    const afterGuess = await guessed;
    assert.equal(afterGuess.board[ownIndex].revealed, true);
    assert.equal(afterGuess.board[ownIndex].color, ownColor);
    assert.equal(afterGuess.board[assassinIndex].color, null);

    const spyGuess = await emit(clueGiver.socket, 'guess', { index: foeIndex });
    assert.match(spyGuess.error, /operative/);

    const passed = waitUntil(clueGiver, (room) => room.phase === 'clue' && room.turn !== turn);
    const endAck = await emit(clueGiver.socket, 'endTurn', {});
    assert.equal(endAck.error, undefined, endAck.error);
    const afterEnd = await passed;
    assert.equal(afterEnd.phase, 'clue');
    assert.notEqual(afterEnd.turn, turn);

    const otherClueGiver = turn === 'red' ? blueSpy : host;
    const otherGuesser = turn === 'red' ? blueOp : redOp;
    const otherClued = waitUntil(otherClueGiver, (room) => room.phase === 'guess' && room.guessesRemaining === 1);
    const otherClueAck = await emit(otherClueGiver.socket, 'giveClue', { word: 'synthetic', count: 0 });
    assert.equal(otherClueAck.error, undefined, otherClueAck.error);
    const otherRoom = await otherClued;
    assert.equal(otherRoom.guessesRemaining, 1);

    const doomed = waitUntil(otherGuesser, (room) => room.phase === 'gameover');
    const doomAck = await emit(otherGuesser.socket, 'guess', { index: assassinIndex });
    assert.equal(doomAck.error, undefined, doomAck.error);
    const finished = await doomed;
    assert.equal(finished.phase, 'gameover');
    assert.equal(finished.winner, turn);
    assert.equal(finished.board[assassinIndex].color, 'assassin');
  } finally {
    for (const client of clients) client.socket.disconnect();
    await server.stop();
    resetRooms();
  }
});
