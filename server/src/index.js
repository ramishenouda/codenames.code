import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { Server } from 'socket.io';
import {
  attachSocket,
  createRoom,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  listRooms,
  maskRoom,
  playAgain,
  postChat,
  randomizeTeams,
  rejoin,
  roomForSocket,
  sit,
  startGame,
  submitClue,
  submitEndTurn,
  submitGuess,
} from './rooms.js';
import { publicStats } from './stats.js';

function ackOf(payload, ack) {
  if (typeof payload === 'function') return { payload: {}, ack: payload };
  return { payload: payload ?? {}, ack: typeof ack === 'function' ? ack : () => {} };
}

function emitRoom(io, room) {
  if (!room) return;
  room.revision = (room.revision ?? 0) + 1;
  for (const player of room.players) {
    if (!player.socketId) continue;
    const socket = io.sockets.sockets.get(player.socketId);
    if (!socket) continue;
    socket.emit('room', maskRoom(room, player.id));
  }
}

export function register(io) {
  io.on('connection', (socket) => {
    const fail = (ack, message) => ack({ error: message });

    const bind = (code, playerId) => {
      const attached = attachSocket(code, playerId, socket.id);
      if (attached.error) return attached;
      socket.data.playerId = playerId;
      socket.data.code = attached.room.code;
      return attached;
    };

    socket.on('createRoom', (raw, rawAck) => {
      const { payload, ack } = ackOf(raw, rawAck);
      const created = createRoom(payload.name);
      if (created.error) return fail(ack, created.error);
      const attached = bind(created.code, created.playerId);
      if (attached.error) return fail(ack, attached.error);
      ack({ code: created.code, token: created.token, playerId: created.playerId });
      emitRoom(io, attached.room);
    });

    socket.on('joinRoom', (raw, rawAck) => {
      const { payload, ack } = ackOf(raw, rawAck);
      const joined = joinRoom(payload.code, payload.name);
      if (joined.error) return fail(ack, joined.error);
      const attached = bind(joined.code, joined.playerId);
      if (attached.error) return fail(ack, attached.error);
      ack({ code: joined.code, token: joined.token, playerId: joined.playerId });
      emitRoom(io, attached.room);
    });

    socket.on('rejoin', (raw, rawAck) => {
      const { payload, ack } = ackOf(raw, rawAck);
      const joined = rejoin(payload.code, payload.token, socket.id);
      if (joined.error) return fail(ack, joined.error);
      socket.data.playerId = joined.room.players.find((player) => player.socketId === socket.id)?.id;
      socket.data.code = joined.room.code;
      ack({ code: joined.room.code, playerId: socket.data.playerId });
      emitRoom(io, joined.room);
    });

    const act = (raw, rawAck, run) => {
      const { payload, ack } = ackOf(raw, rawAck);
      const code = socket.data.code;
      const playerId = socket.data.playerId;
      if (!code || !playerId) return fail(ack, 'Join a room first.');
      const result = run(code, playerId, payload);
      if (result.error) return fail(ack, result.error);
      ack({ ok: true });
      if (!result.closed) emitRoom(io, result.room);
    };

    socket.on('sit', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId, payload) => sit(code, playerId, payload.team, payload.role));
    });

    socket.on('startGame', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId) => startGame(code, playerId));
    });

    socket.on('randomize', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId) => randomizeTeams(code, playerId));
    });

    socket.on('giveClue', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId, payload) => submitClue(code, playerId, payload.word, payload.count));
    });

    socket.on('guess', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId, payload) => submitGuess(code, playerId, payload.index));
    });

    socket.on('endTurn', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId) => submitEndTurn(code, playerId));
    });

    socket.on('playAgain', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId) => playAgain(code, playerId));
    });

    socket.on('chat', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId, payload) => postChat(code, playerId, payload.text));
    });

    socket.on('leave', (raw, rawAck) => {
      act(raw, rawAck, (code, playerId) => {
        const result = leaveRoom(code, playerId);
        if (!result.error) {
          socket.data.code = null;
          socket.data.playerId = null;
        }
        return result;
      });
    });

    socket.on('disconnect', () => {
      const room = disconnectSocket(socket.id, (result) => {
        if (!result?.error && !result?.closed) emitRoom(io, result.room);
      });
      emitRoom(io, room);
    });
  });
}

function requestOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

function sendText(res, status, type, body) {
  res.writeHead(status, {
    'content-type': `${type}; charset=utf-8`,
    'cache-control': 'public, max-age=300',
  });
  res.end(body);
}

export function start(port = 3001) {
  const httpServer = createServer((req, res) => {
    const url = req.url?.split('?')[0];
    if (url?.startsWith('/socket.io')) return;
    if (req.method === 'GET' && url === '/api/stats') {
      const body = JSON.stringify(publicStats(listRooms()));
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url === '/robots.txt') {
      const origin = requestOrigin(req);
      sendText(
        res,
        200,
        'text/plain',
        [
          'User-agent: *',
          'Allow: /',
          'Allow: /stats',
          'Disallow: /*?*room=',
          `Sitemap: ${origin}/sitemap.xml`,
          '',
        ].join('\n'),
      );
      return;
    }
    if (req.method === 'GET' && url === '/sitemap.xml') {
      const origin = requestOrigin(req);
      sendText(
        res,
        200,
        'application/xml',
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          `  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
          `  <url><loc>${origin}/stats</loc><changefreq>hourly</changefreq><priority>0.4</priority></url>`,
          '</urlset>',
          '',
        ].join('\n'),
      );
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
  const io = new Server(httpServer, { cors: { origin: '*' } });
  register(io);
  return new Promise((resolve) => {
    httpServer.listen(port, '127.0.0.1', () => {
      resolve({
        io,
        httpServer,
        port: httpServer.address().port,
        async stop() {
          io.disconnectSockets(true);
          await new Promise((done) => httpServer.close(() => done()));
        },
      });
    });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT) || 3010;
  start(port).then(({ port: listening }) => {
    console.log(`codenames server on ${listening}`);
  });
}

export { roomForSocket };
