import { TICKER } from "../data/content";

export default function Marquee() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee__track">
        {items.map((t, i) => (
          <span className="marquee__item" key={`${t}-${i}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
