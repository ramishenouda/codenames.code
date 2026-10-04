import { io } from 'socket.io-client';

export const socket = io({ autoConnect: false });

const SESSION_KEY = 'codenames-session';
const NAME_KEY = 'codenames-name';

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadName() {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function saveName(name) {
  localStorage.setItem(NAME_KEY, name);
}

export function roomFromUrl() {
  return new URLSearchParams(window.location.search).get('room')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) ?? '';
}

export function setRoomInUrl(code) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  window.history.replaceState({}, '', url);
}
