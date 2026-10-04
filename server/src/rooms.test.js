import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachSocket,
  createRoom,
  disconnectSocket,
  joinRoom,
  maskRoom,
  randomizeTeams,
  rejoin,
  resetRooms,
  setDepartureMs,
  sit,
  startGame,
} from './rooms.js';

test.afterEach(() => {
  resetRooms();
});

function seat(code, name) {
  const joined = joinRoom(code, name);
  assert.equal(joined.error, undefined, joined.error);
  return joined;
}

test('randomize splits the room and assigns one spymaster per team', () => {
  const host = createRoom('Ava');
  seat(host.code, 'Bo');
  seat(host.code, 'Cy');
  seat(host.code, 'Dee');
  seat(host.code, 'Eve');
  const guest = joinRoom(host.code, 'Finn');
  const denied = randomizeTeams(host.code, guest.playerId, () => 0);
  assert.match(denied.error, /host/);

  const shuffled = randomizeTeams(host.code, host.playerId, () => 0);
  assert.equal(shuffled.ok, true);
  const red = shuffled.room.players.filter((player) => player.team === 'red');
  const blue = shuffled.room.players.filter((player) => player.team === 'blue');
  assert.equal(red.length, 3);
  assert.equal(blue.length, 3);
  assert.equal(red.filter((player) => player.role === 'spymaster').length, 1);
  assert.equal(blue.filter((player) => player.role === 'spymaster').length, 1);
  assert.equal(shuffled.room.players.every((player) => player.role), true);
  assert.equal(maskRoom(shuffled.room, host.playerId).actions.randomize, true);
});

test('randomize is refused once the cards are dealt', () => {
  const host = createRoom('Ava');
  const bo = seat(host.code, 'Bo');
  const cy = seat(host.code, 'Cy');
  const dee = seat(host.code, 'Dee');
  sit(host.code, host.playerId, 'red', 'spymaster');
  sit(host.code, bo.playerId, 'red', 'operative');
  sit(host.code, cy.playerId, 'blue', 'spymaster');
  sit(host.code, dee.playerId, 'blue', 'operative');
  assert.equal(startGame(host.code, host.playerId).ok, true);
  assert.match(randomizeTeams(host.code, host.playerId).error, /lock/);
});

test('closing the connection removes the player, and a quick reconnect keeps the seat', async () => {
  setDepartureMs(40);
  const host = createRoom('Ava');
  const guest = seat(host.code, 'Bo');
  attachSocket(host.code, host.playerId, 'sock-host');
  attachSocket(host.code, guest.playerId, 'sock-guest');

  disconnectSocket('sock-guest');
  const kept = rejoin(host.code, guest.token, 'sock-guest-2');
  assert.equal(kept.ok, true);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(kept.room.players.some((player) => player.id === guest.playerId), true);

  disconnectSocket('sock-guest-2');
  await new Promise((resolve) => setTimeout(resolve, 80));
  const gone = rejoin(host.code, guest.token, 'sock-guest-3');
  assert.match(gone.error, /no longer open/);
});
