const HOME = {
  title: 'Codenames — play online with friends',
  description:
    'Free online Codenames. Create a room, share the code, and play the classic word game with spymasters and operatives in real time.',
  robots: 'index,follow',
};

const STATS = {
  title: 'Codenames · Stats',
  description:
    'Live and lifetime statistics for this Codenames server: open rooms, players online, games finished, and who won.',
  robots: 'index,follow',
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

export function applySeo({ title, description, robots, path = '/' }) {
  const url = `${window.location.origin}${path}`;
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
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
