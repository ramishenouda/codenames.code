export default function Frame({ className = '', brand = true, children }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {brand && <Brand />}
      {children}
    </section>
  );
}

export function Brand() {
  return (
    <h1 className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      Codenames
    </h1>
  );
}

export function Glyph({ children }) {
  return (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}
