const packs = {
  red: import.meta.glob('./art/red/*.webp', { eager: true, import: 'default' }),
  blue: import.meta.glob('./art/blue/*.webp', { eager: true, import: 'default' }),
  neutral: import.meta.glob('./art/white/*.webp', { eager: true, import: 'default' }),
  assassin: import.meta.glob('./art/black/*.webp', { eager: true, import: 'default' }),
};

function byNumber(map) {
  return Object.entries(map)
    .sort(([a], [b]) => {
      const na = Number(a.match(/(\d+)\.webp$/)?.[1] ?? 0);
      const nb = Number(b.match(/(\d+)\.webp$/)?.[1] ?? 0);
      return na - nb;
    })
    .map(([, url]) => url);
}

export const paintings = {
  red: byNumber(packs.red),
  blue: byNumber(packs.blue),
  neutral: byNumber(packs.neutral),
  assassin: byNumber(packs.assassin),
};

export function hiddenPainting(index) {
  const shifted = index < 20 ? (index * 3) % 20 : (index * 3 + 7) % 20;
  return paintingUrl('neutral', shifted);
}

export function paintingUrl(color, index = 0) {
  const pack = color === 'assassin' && !paintings.assassin.length
    ? paintings.neutral
    : paintings[color];
  if (!pack?.length) return null;
  const safe = Number.isInteger(index) ? index : 0;
  return pack[((safe % pack.length) + pack.length) % pack.length];
}
