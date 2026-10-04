export default function Frame({ className = '', children }) {
  return (
    <section className={`parchment ${className}`.trim()}>
      <h1 className="plaque">Codenames</h1>
      <span className="corner nw" aria-hidden="true" />
      <span className="corner ne" aria-hidden="true" />
      <span className="corner sw" aria-hidden="true" />
      <span className="corner se" aria-hidden="true" />
      {children}
    </section>
  );
}

export function Glyph({ children }) {
  return (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}
