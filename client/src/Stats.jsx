import { useEffect, useState } from 'react';
import { Brand } from './Frame.jsx';
import { seoStats } from './seo.js';

function since(startedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  if (minutes < 1) return 'The server just started.';
  const span = minutes < 60
    ? `${minutes} minute${minutes === 1 ? '' : 's'}`
    : minutes < 60 * 48
      ? `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? '' : 's'}`
      : `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) === 1 ? '' : 's'}`;
  return `Kept since the server started ${span} ago.`;
}

function Tile({ value, label, tone }) {
  return (
    <article className={`stat-tile${tone ? ` ${tone}` : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    seoStats();
    let stop = false;

    async function load() {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('unavailable');
        const data = await response.json();
        if (!stop) {
          setStats(data);
          setError('');
        }
      } catch {
        if (!stop) setError('The table is not answering.');
      }
    }

    load();
    const timer = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const live = stats?.live;
  const totals = stats?.totals;
  const decided = (totals?.redWins ?? 0) + (totals?.blueWins ?? 0);
  const redShare = decided ? Math.round((totals.redWins / decided) * 100) : 0;

  return (
    <main className="desk">
      <section className="panel stats-card">
        <Brand />
        <div className="stats-head">
          <div>
            <h2>Statistics</h2>
            <p className="lede">
              {stats ? since(stats.startedAt) : 'Loading the table…'}
            </p>
          </div>
          <a className="quiet-link" href="/">Back to the table</a>
        </div>
        {error && <p className="banner" role="alert">{error}</p>}
        <h3>Right now</h3>
        <div className="stat-grid">
          <Tile value={live?.rooms ?? '–'} label="Open rooms" />
          <Tile value={live?.connected ?? '–'} label="Players online" />
          <Tile value={live?.playing ?? '–'} label="Games in play" />
          <Tile value={live?.lobby ?? '–'} label="Lobbies waiting" />
        </div>
        <h3>Since startup</h3>
        <div className="stat-grid">
          <Tile value={totals?.rooms ?? '–'} label="Rooms created" />
          <Tile value={totals?.games ?? '–'} label="Games dealt" />
          <Tile value={totals?.finished ?? '–'} label="Games finished" />
          <Tile value={totals?.clues ?? '–'} label="Clues given" />
          <Tile value={totals?.guesses ?? '–'} label="Cards flipped" />
          <Tile value={totals?.agents ?? '–'} label="Agents found" />
          <Tile value={totals?.bystanders ?? '–'} label="Bystanders" />
          <Tile value={totals?.assassins ?? '–'} label="Assassins hit" />
        </div>
        <h3>Who won</h3>
        <div className="win-bar" aria-hidden={decided === 0}>
          {decided > 0 && (
            <>
              <span className="red" style={{ width: `${redShare}%` }} />
              <span className="blue" style={{ width: `${100 - redShare}%` }} />
            </>
          )}
        </div>
        <div className="stat-grid wins">
          <Tile value={totals?.redWins ?? '–'} label="Red wins" tone="red" />
          <Tile value={totals?.blueWins ?? '–'} label="Blue wins" tone="blue" />
          <Tile value={totals?.agentWins ?? '–'} label="Won by agents" />
          <Tile value={totals?.assassinWins ?? '–'} label="Won by assassin" />
        </div>
      </section>
    </main>
  );
}
