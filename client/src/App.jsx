import { useCallback, useEffect, useState } from 'react';
import Board from './Board.jsx';
import Home from './Home.jsx';
import Lobby from './Lobby.jsx';
import {
  clearSession,
  loadSession,
  roomFromUrl,
  saveName,
  saveSession,
  setRoomInUrl,
  socket,
} from './socket.js';

export default function App() {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);

  const send = useCallback((event, payload = {}) => new Promise((resolve) => {
    socket.emit(event, payload, (res) => {
      if (res?.error) setError(res.error);
      else setError('');
      resolve(res ?? {});
    });
  }), []);

  useEffect(() => {
    const onRoom = (next) => {
      setRoom(next);
      setError('');
      setRoomInUrl(next.code);
      document.title = `Codenames · ${next.code}`;
    };
    const rejoin = () => {
      const session = loadSession();
      if (!session) return;
      socket.emit('rejoin', session, (res) => {
        if (res?.error) {
          clearSession();
          setRoom(null);
          setRoomInUrl('');
          document.title = 'Codenames';
          setError('That game is no longer open. Start a new one.');
        }
      });
    };
    const onConnect = () => {
      setOnline(true);
      rejoin();
    };
    const onDisconnect = () => setOnline(false);

    socket.on('room', onRoom);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off('room', onRoom);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  async function enter(event, name, extra) {
    const cleaned = name.trim();
    if (!cleaned) {
      setError('Enter a name, up to 16 characters.');
      return;
    }
    saveName(cleaned);
    const res = await send(event, { name: cleaned, ...extra });
    if (res.token) saveSession({ code: res.code, token: res.token });
  }

  async function leave() {
    const res = await send('leave');
    if (res.error) return;
    clearSession();
    setRoom(null);
    setRoomInUrl('');
    document.title = 'Codenames';
  }

  if (!room) {
    return (
      <Home
        online={online}
        error={error}
        initialCode={roomFromUrl()}
        onCreate={(name) => enter('createRoom', name)}
        onJoin={(name, code) => enter('joinRoom', name, { code })}
      />
    );
  }

  if (room.phase === 'lobby') {
    return (
      <Lobby
        room={room}
        error={error}
        onSit={(team, role) => send('sit', { team, role })}
        onRandomize={() => send('randomize')}
        onStart={() => send('startGame')}
        onChat={(text) => send('chat', { text })}
        onLeave={leave}
      />
    );
  }

  return (
    <Board
      room={room}
      error={error}
      onClue={(word, count) => send('giveClue', { word, count })}
      onGuess={(index) => send('guess', { index })}
      onEndTurn={() => send('endTurn')}
      onPlayAgain={() => send('playAgain')}
      onChat={(text) => send('chat', { text })}
      onLeave={leave}
    />
  );
}
