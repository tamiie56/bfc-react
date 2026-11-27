import { useEffect, useState } from "react";
import combo from "../assets/images/ab2.png";
import crispy from "../assets/images/g-crispy.jpg";
import drumstick from "../assets/images/g-drumstick.jpg";
import fries from "../assets/images/g-fries.jpg";

interface Pick {
  title: string;
  tag: string;
  image: string;
}

/** The best items shown in the hero, one after another. */
const PICKS: Pick[] = [
  { title: "Sauce-Dipped Crispy Chicken", tag: "Best Seller", image: drumstick },
  { title: "Golden Fries", tag: "Crowd Favourite", image: fries },
  { title: "Crispy Chicken Pieces", tag: "Signature Taste", image: crispy },
  { title: "BFC Combo Meal", tag: "Best Value", image: combo },
];

/** how long each item stays on screen once it has arrived (ms) */
const HOLD_MS = 3800;
/** length of the roll-in / roll-out animations (ms) - keep in sync with the CSS */
const IN_MS = 1000;
const OUT_MS = 700;

/**
 * A plate that rolls into the hero, stays for a few seconds, rolls out and is replaced
 * by the next best item. Purely decorative, so it is hidden from screen readers.
 */
export default function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const t = window.setTimeout(
      () => {
        if (phase === "in") {
          setPhase("out");
        } else {
          setIndex((i) => (i + 1) % PICKS.length);
          setPhase("in");
        }
      },
      phase === "in" ? IN_MS + HOLD_MS : OUT_MS
    );
    return () => window.clearTimeout(t);
  }, [phase, index]);

  const pick = PICKS[index];

  return (
    <div className="hero__stage" aria-hidden="true">
      <span className="hero__ring" />
      <span className="hero__glow" />

      <div key={index} className={`hero__plate is-${phase}`}>
        <div className="hero__float">
          <img src={pick.image} alt="" draggable={false} />
        </div>
      </div>

      <div key={`c${index}`} className={`hero__caption is-${phase}`}>
        <small>{pick.tag}</small>
        <strong>{pick.title}</strong>
        <span className="hero__dots">
          {PICKS.map((p, i) => (
            <i key={p.title} className={i === index ? "is-on" : ""} />
          ))}
        </span>
      </div>
    </div>
  );
}
