import { SITE_URL } from './site.js';

const HOME = {
  title: 'Codenames.codes — Play Codenames online free with friends',
  description:
    'Free online Codenames. Create a room, share the code, and play the classic word game with spymasters and operatives in real time.',
  robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
};

const STATS = {
  title: 'Stats · Codenames.codes',
  description:
    'Live and lifetime statistics for this Codenames server: open rooms, players online, games finished, and who won.',
  robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
};

const ROOM = {
  title: 'Codenames',
  description: 'A private Codenames room. Join only with an invite code.',
  robots: 'noindex,nofollow',
};

function upsertMeta(attribute, key, value) {
  const selector = `meta[${attribute}="${key}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.setAttribute('content', value);
}

function upsertCanonical(href) {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

function absolute(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function applySeo({ title, description, robots, path = '/' }) {
  const url = absolute(path);
  const image = absolute('/og.png');
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertMeta('name', 'googlebot', robots);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:alt', 'Codenames online word game');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertCanonical(url);
}

export function seoHome() {
  applySeo({ ...HOME, path: '/' });
}

export function seoStats() {
  applySeo({ ...STATS, path: '/stats' });
}

export function seoRoom(code) {
  applySeo({
    ...ROOM,
    title: code ? `Codenames · ${code}` : ROOM.title,
    path: code ? `/?room=${encodeURIComponent(code)}` : '/',
  });
}
