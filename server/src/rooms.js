import { randomBytes, randomUUID } from 'node:crypto';
import { createGame, endTurn, giveClue, guessCard } from './game.js';
import { WORDS } from './words.js';

const rooms = new Map();
const tokens = new Map();
const emptyTimers = new Map();
const departures = new Map();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMPTY_ROOM_MS = 15 * 60 * 1000;
const MAX_PLAYERS = 12;
let departureMs = 1500;

function makeCode() {
  let code = '';
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function cleanName(name) {
  const cleaned = String(name ?? '')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 1 || cleaned.length > 16) return null;
  return cleaned;
}

function makePlayer(name) {
  const player = {
    id: randomUUID(),
    token: randomBytes(24).toString('hex'),
    name,
    team: null,
    role: null,
    connected: false,
    socketId: null,
  };
  return player;
}

function clearDoom(code) {
  const timer = emptyTimers.get(code);
  if (timer) clearTimeout(timer);
  emptyTimers.delete(code);
}

function touch(room) {
  const anyone = room.players.some((player) => player.connected);
  if (anyone) {
    clearDoom(room.code);
    return;
  }
  if (emptyTimers.has(room.code)) return;
  emptyTimers.set(room.code, setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current || current.players.some((player) => player.connected)) return;
    for (const player of current.players) tokens.delete(player.token);
    rooms.delete(room.code);
    emptyTimers.delete(room.code);
  }, EMPTY_ROOM_MS));
}

function cancelDeparture(playerId) {
  const timer = departures.get(playerId);
  if (timer) clearTimeout(timer);
  departures.delete(playerId);
}

export function setDepartureMs(ms) {
  departureMs = ms;
}

export function resetRooms() {
  for (const timer of emptyTimers.values()) clearTimeout(timer);
  for (const timer of departures.values()) clearTimeout(timer);
  emptyTimers.clear();
  departures.clear();
  rooms.clear();
  tokens.clear();
  departureMs = 1500;
}

export function rosterReady(room) {
  return ['red', 'blue'].every((team) => {
    const members = room.players.filter((player) => player.team === team);
    const spies = members.filter((player) => player.role === 'spymaster').length;
    const operatives = members.filter((player) => player.role === 'operative').length;
    return spies === 1 && operatives >= 1;
  });
}

function publicCard(card, showKey) {
  const art = Number.isInteger(card.art) ? card.art : 0;
  if (showKey || card.revealed) {
    return { word: card.word, color: card.color, revealed: card.revealed, art };
  }
  return { word: card.word, color: null, revealed: false, art };
}

function counts(cards) {
  const tally = (color) => ({
    total: cards.filter((card) => card.color === color).length,
    left: cards.filter((card) => card.color === color && !card.revealed).length,
  });
  return { red: tally('red'), blue: tally('blue') };
}

export function maskRoom(room, playerId) {
  const you = room.players.find((player) => player.id === playerId) ?? null;
  const game = room.game;
  const showKey = Boolean(
    game && (game.phase === 'gameover' || (you && you.role === 'spymaster')),
  );
  const myTurn = Boolean(you && game && you.team === game.turn);
  return {
    code: room.code,
    revision: room.revision ?? 0,
    youId: you?.id ?? null,
    hostId: room.hostId,
    phase: game?.phase ?? 'lobby',
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team,
      role: player.role,
      connected: player.connected,
    })),
    yourTeam: you?.team ?? null,
    yourRole: you?.role ?? null,
    turn: game?.turn ?? null,
    startingTeam: game?.startingTeam ?? null,
    clue: game?.clue ?? null,
    guessesRemaining: game?.guessesRemaining ?? null,
    winner: game?.winner ?? null,
    board: game ? game.cards.map((card) => publicCard(card, showKey)) : null,
    counts: game ? counts(game.cards) : null,
    log: game?.log ?? [],
    chat: room.chat,
    actions: {
      clue: Boolean(myTurn && you.role === 'spymaster' && game.phase === 'clue'),
      guess: Boolean(myTurn && you.role === 'operative' && game.phase === 'guess'),
      endTurn: Boolean(myTurn && game.phase === 'guess' && (you.role === 'operative' || you.role === 'spymaster')),
      start: Boolean(you && you.id === room.hostId && !game && rosterReady(room)),
      randomize: Boolean(you && you.id === room.hostId && !game && room.players.length >= 2),
      playAgain: Boolean(you && you.id === room.hostId && game?.phase === 'gameover'),
      sit: !game,
    },
    startHint: rosterReady(room)
      ? ''
      : 'Each team needs one spymaster and at least one operative.',
  };
}

function requireRoom(code) {
  const room = rooms.get(String(code ?? '').trim().toUpperCase());
  if (!room) return { error: 'No room with that code.' };
  return { room };
}

function requirePlayer(room, playerId) {
  const player = room.players.find((entry) => entry.id === playerId);
  if (!player) return { error: 'You are not in this room.' };
  return { player };
}

export function createRoom(name) {
  const cleaned = cleanName(name);
  if (!cleaned) return { error: 'Enter a name, up to 16 characters.' };
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();
  const player = makePlayer(cleaned);
  const room = {
    code,
    hostId: player.id,
    players: [player],
    game: null,
    chat: [],
  };
  rooms.set(code, room);
  tokens.set(player.token, { code, playerId: player.id });
  return { ok: true, code, token: player.token, playerId: player.id };
}

export function joinRoom(code, name) {
  const cleaned = cleanName(name);
  if (!cleaned) return { error: 'Enter a name, up to 16 characters.' };
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (room.players.length >= MAX_PLAYERS) return { error: 'That room is full.' };
  const player = makePlayer(cleaned);
  room.players.push(player);
  tokens.set(player.token, { code: room.code, playerId: player.id });
  return { ok: true, code: room.code, token: player.token, playerId: player.id };
}

export function attachSocket(code, playerId, socketId) {
  const found = requireRoom(code);
  if (found.error) return found;
  const player = found.room.players.find((entry) => entry.id === playerId);
  if (!player) return { error: 'You are not in this room.' };
  cancelDeparture(player.id);
  player.socketId = socketId;
  player.connected = true;
  touch(found.room);
  return { ok: true, room: found.room };
}

export function rejoin(code, token, socketId) {
  const saved = tokens.get(token);
  if (!saved || saved.code !== String(code ?? '').trim().toUpperCase()) {
    return { error: 'That seat is no longer open.' };
  }
  return attachSocket(saved.code, saved.playerId, socketId);
}

function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function disconnectSocket(socketId, onDepart) {
  for (const room of rooms.values()) {
    const player = room.players.find((entry) => entry.socketId === socketId);
    if (!player) continue;
    player.connected = false;
    player.socketId = null;
    touch(room);
    cancelDeparture(player.id);
    const playerId = player.id;
    const code = room.code;
    departures.set(playerId, setTimeout(() => {
      departures.delete(playerId);
      const current = rooms.get(code);
      const still = current?.players.find((entry) => entry.id === playerId);
      if (!still || still.connected) return;
      const result = leaveRoom(code, playerId);
      if (onDepart) onDepart(result);
    }, departureMs));
    return room;
  }
  return null;
}

export function randomizeTeams(code, playerId, random = Math.random) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (room.hostId !== playerId) return { error: 'Only the host can randomize teams.' };
  if (room.game) return { error: 'Teams lock once the game starts.' };
  if (room.players.length < 2) return { error: 'Need at least two players to randomize.' };
  const order = shuffle(room.players, random);
  const firstCount = Math.ceil(order.length / 2);
  const firstTeam = random() < 0.5 ? 'red' : 'blue';
  const secondTeam = firstTeam === 'red' ? 'blue' : 'red';
  order.forEach((player, index) => {
    const onFirst = index < firstCount;
    const place = onFirst ? index : index - firstCount;
    player.team = onFirst ? firstTeam : secondTeam;
    player.role = place === 0 ? 'spymaster' : 'operative';
  });
  return { ok: true, room };
}

export function sit(code, playerId, team, role) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (room.game) return { error: 'Seats are locked for this game.' };
  if (team !== 'red' && team !== 'blue') return { error: 'Pick a team.' };
  if (role !== 'spymaster' && role !== 'operative') return { error: 'Pick a role.' };
  const seated = requirePlayer(room, playerId);
  if (seated.error) return seated;
  if (role === 'spymaster') {
    const taken = room.players.find((player) => (
      player.id !== playerId && player.team === team && player.role === 'spymaster'
    ));
    if (taken) return { error: `${taken.name} already has that spymaster seat.` };
  }
  seated.player.team = team;
  seated.player.role = role;
  return { ok: true, room };
}

export function startGame(code, playerId) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (room.hostId !== playerId) return { error: 'Only the host can start the game.' };
  if (room.game) return { error: 'The game has already started.' };
  if (!rosterReady(room)) {
    return { error: 'Each team needs one spymaster and at least one operative.' };
  }
  room.game = createGame(WORDS);
  return { ok: true, room };
}

export function submitClue(code, playerId, word, count) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (!room.game) return { error: 'The game has not started.' };
  const seated = requirePlayer(room, playerId);
  if (seated.error) return seated;
  const { player } = seated;
  if (player.role !== 'spymaster' || player.team !== room.game.turn || room.game.phase !== 'clue') {
    return { error: 'Only the current spymaster can give a clue.' };
  }
  const result = giveClue(room.game, { word, count });
  if (!result.ok) return result;
  room.game = result.game;
  return { ok: true, room };
}

export function submitGuess(code, playerId, index) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (!room.game) return { error: 'The game has not started.' };
  const seated = requirePlayer(room, playerId);
  if (seated.error) return seated;
  const { player } = seated;
  if (player.role !== 'operative' || player.team !== room.game.turn || room.game.phase !== 'guess') {
    return { error: 'Only an operative on the guessing team can flip a card.' };
  }
  const result = guessCard(room.game, index);
  if (!result.ok) return result;
  room.game = result.game;
  return { ok: true, room };
}

export function submitEndTurn(code, playerId) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (!room.game) return { error: 'The game has not started.' };
  const seated = requirePlayer(room, playerId);
  if (seated.error) return seated;
  const { player } = seated;
  const onTurn = player.team === room.game.turn
    && (player.role === 'operative' || player.role === 'spymaster');
  if (!onTurn) return { error: 'Only the team that is guessing can end the turn.' };
  const result = endTurn(room.game);
  if (!result.ok) return result;
  room.game = result.game;
  return { ok: true, room };
}

export function playAgain(code, playerId) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  if (room.hostId !== playerId) return { error: 'Only the host can deal again.' };
  if (room.game?.phase !== 'gameover') return { error: 'The round is still going.' };
  room.game = createGame(WORDS);
  return { ok: true, room };
}

export function postChat(code, playerId, text) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  const seated = requirePlayer(room, playerId);
  if (seated.error) return seated;
  const cleaned = String(text ?? '').replace(/[\u0000-\u001F]/g, '').trim();
  if (!cleaned) return { error: 'Write a message first.' };
  if (cleaned.length > 200) return { error: 'Keep messages under 200 characters.' };
  room.chat = [
    ...room.chat,
    { id: randomUUID(), name: seated.player.name, text: cleaned, at: Date.now() },
  ].slice(-40);
  return { ok: true, room };
}

export function leaveRoom(code, playerId) {
  const found = requireRoom(code);
  if (found.error) return found;
  const { room } = found;
  const index = room.players.findIndex((player) => player.id === playerId);
  if (index === -1) return { error: 'You are not in this room.' };
  const [player] = room.players.splice(index, 1);
  tokens.delete(player.token);
  cancelDeparture(player.id);
  if (room.game) {
    room.game = {
      ...room.game,
      log: [...room.game.log, { kind: 'system', text: `${player.name} left the room.` }],
    };
  }
  if (room.players.length === 0) {
    clearDoom(room.code);
    rooms.delete(room.code);
    return { ok: true, closed: true };
  }
  if (room.hostId === playerId) room.hostId = room.players[0].id;
  touch(room);
  return { ok: true, room };
}

export function roomForSocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((player) => player.socketId === socketId)) return room;
  }
  return null;
}
