import { useEffect, useRef, useState, type CSSProperties } from "react";
import combo from "../assets/images/ab2.png";
import crispy from "../assets/images/g-crispy.jpg";
import drumstick from "../assets/images/g-drumstick.jpg";
import fries from "../assets/images/g-fries.jpg";

interface Pick {
  title: string;
  tag: string;
  /** big outlined word behind the plate */
  word: string;
  /** colour of the glow, ring, sparks and sticker */
  accent: string;
  image: string;
}

/** The best items shown in the hero, one after another. */
const PICKS: Pick[] = [
  { title: "Sauce-Dipped Crispy Chicken", tag: "Best Seller", word: "Crunchy", accent: "#ff7a1a", image: drumstick },
  { title: "Golden Fries", tag: "Crowd Favourite", word: "Golden", accent: "#ffc80a", image: fries },
  { title: "Crispy Chicken Pieces", tag: "Signature Taste", word: "Juicy", accent: "#ff4d2e", image: crispy },
  { title: "BFC Combo Meal", tag: "Best Value", word: "Combo", accent: "#f0a30a", image: combo },
];

/** how long each item stays on screen once it has arrived (ms) */
const HOLD_MS = 4200;
/** length of the roll-in / roll-out animations (ms) - keep in sync with the CSS */
const IN_MS = 1000;
const OUT_MS = 700;

const ORBIT_TEXT = "BEST FRIED CHICKEN \u2605 SINCE 2002 \u2605 BEST FRIED CHICKEN \u2605 SINCE 2002 \u2605 ";

/** a fixed set of sparks (x offset in %, size in px, delay and duration in s) - no randomness during render */
const SPARKS = [
  { x: 8, s: 5, d: 0, t: 5.2 },
  { x: 18, s: 3, d: 1.4, t: 4.4 },
  { x: 27, s: 6, d: 0.6, t: 6 },
  { x: 36, s: 4, d: 2.3, t: 4.8 },
  { x: 46, s: 3, d: 0.9, t: 5.6 },
  { x: 55, s: 5, d: 3.1, t: 4.6 },
  { x: 64, s: 4, d: 1.8, t: 5.8 },
  { x: 73, s: 6, d: 0.3, t: 5 },
  { x: 82, s: 3, d: 2.7, t: 4.2 },
  { x: 91, s: 5, d: 1.1, t: 6.2 },
];

/**
 * A plate that rolls into the hero, holds for a few seconds while a ring fills up around it,
 * rolls out and is replaced by the next best item. Purely decorative, so it is hidden from
 * screen readers.
 */
export default function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const stageRef = useRef<HTMLDivElement>(null);

  // roll in -> hold -> roll out -> next item
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

  // the plate leans a little towards the mouse (desktop only)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--mx", ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        el.style.setProperty("--my", ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const pick = PICKS[index];
  const style = { "--accent": pick.accent, "--hold": `${HOLD_MS}ms`, "--in": `${IN_MS}ms` } as CSSProperties;

  return (
    <div className="hero__stage" ref={stageRef} style={style} aria-hidden="true">
      <div key={`g${index}`} className={`hero__aura is-${phase}`} />

      <div key={`w${index}`} className={`hero__word is-${phase}`}>
        {pick.word}
      </div>

      <div className="hero__sparks">
        {SPARKS.map((sp) => (
          <i
            key={sp.x}
            style={{ left: `${sp.x}%`, width: sp.s, height: sp.s, animationDelay: `${sp.d}s`, animationDuration: `${sp.t}s` }}
          />
        ))}
      </div>

      <svg className="hero__orbit" viewBox="0 0 200 200">
        <defs>
          <path id="heroOrbitPath" d="M 100,100 m -92,0 a 92,92 0 1,1 184,0 a 92,92 0 1,1 -184,0" />
        </defs>
        <text>
          <textPath href="#heroOrbitPath" textLength="575" lengthAdjust="spacing">
            {ORBIT_TEXT}
          </textPath>
        </text>
      </svg>

      <svg key={`p${index}`} className={`hero__progress is-${phase}`} viewBox="0 0 200 200">
        <circle className="hero__progress-track" cx="100" cy="100" r="80" />
        <circle className="hero__progress-bar" cx="100" cy="100" r="80" />
      </svg>

      <div className="hero__tilt">
        <div key={index} className={`hero__plate is-${phase}`}>
          <div className="hero__float">
            <img src={pick.image} alt="" draggable={false} />
          </div>
        </div>

        <span key={`s${index}`} className={`hero__shock is-${phase}`} />
        <span key={`t${index}`} className={`hero__sticker is-${phase}`}>
          {pick.tag}
        </span>
      </div>

      <div key={`c${index}`} className={`hero__caption is-${phase}`}>
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
