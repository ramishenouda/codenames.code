const startedAt = Date.now();

const totals = {
  rooms: 0,
  games: 0,
  finished: 0,
  redWins: 0,
  blueWins: 0,
  assassinWins: 0,
  agentWins: 0,
  clues: 0,
  guesses: 0,
  agents: 0,
  bystanders: 0,
  assassins: 0,
};

export function noteRoom() {
  totals.rooms += 1;
}

export function noteGame() {
  totals.games += 1;
}

export function noteClue() {
  totals.clues += 1;
}

export function noteGuess(color) {
  totals.guesses += 1;
  if (color === 'assassin') totals.assassins += 1;
  else if (color === 'neutral') totals.bystanders += 1;
  else if (color === 'red' || color === 'blue') totals.agents += 1;
}

export function noteFinish(winner, byAssassin) {
  totals.finished += 1;
  if (winner === 'red') totals.redWins += 1;
  if (winner === 'blue') totals.blueWins += 1;
  if (byAssassin) totals.assassinWins += 1;
  else totals.agentWins += 1;
}

export function liveStats(roomList) {
  let players = 0;
  let connected = 0;
  let lobby = 0;
  let playing = 0;
  let finished = 0;
  for (const room of roomList) {
    players += room.players.length;
    connected += room.players.filter((player) => player.connected).length;
    const phase = room.game?.phase;
    if (!phase) lobby += 1;
    else if (phase === 'gameover') finished += 1;
    else playing += 1;
  }
  return {
    rooms: roomList.length,
    players,
    connected,
    lobby,
    playing,
    finished,
  };
}

export function publicStats(roomList) {
  return {
    startedAt,
    live: liveStats(roomList),
    totals: { ...totals },
  };
}

export function resetStats() {
  for (const key of Object.keys(totals)) totals[key] = 0;
}
