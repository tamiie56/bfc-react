import { useEffect, useRef, useState, type CSSProperties } from "react";
import combo from "../assets/images/ab2.png";
import crispy from "../assets/images/g-crispy.jpg";
import drumstick from "../assets/images/g-drumstick.jpg";
import fries from "../assets/images/g-fries.jpg";

interface Pick {
  title: string;
  tag: string;
  /** big outlined word behind the deck */
  word: string;
  /** colour of the glow, card border, sparks and light disc */
  accent: string;
  image: string;
  /** which part of the photo stays visible inside the tall card */
  focus: string;
}

/** The best items shown in the hero, one after another. */
const PICKS: Pick[] = [
  { title: "Sauce-Dipped Crispy Chicken", tag: "Best Seller", word: "Crunchy", accent: "#ff7a1a", image: drumstick, focus: "50% 30%" },
  { title: "Golden Fries", tag: "Crowd Favourite", word: "Golden", accent: "#ffc80a", image: fries, focus: "50% 50%" },
  { title: "Crispy Chicken Pieces", tag: "Signature Taste", word: "Juicy", accent: "#ff4d2e", image: crispy, focus: "30% 50%" },
  { title: "BFC Combo Meal", tag: "Best Value", word: "Combo", accent: "#f0a30a", image: combo, focus: "50% 50%" },
];

/** time one item stays in front before the deck moves on (ms) */
const CYCLE_MS = 5200;
/** how long the cards take to slide to their new place (ms) - keep in sync with --move */
const MOVE_MS = 1100;

const pad = (n: number) => String(n).padStart(2, "0");

/** a fixed set of sparks (x offset in %, size in px, delay and duration in s) - no randomness during render */
const SPARKS = [
  { x: 6, s: 5, d: 0, t: 5.2 },
  { x: 17, s: 3, d: 1.4, t: 4.4 },
  { x: 29, s: 6, d: 0.6, t: 6 },
  { x: 42, s: 4, d: 2.3, t: 4.8 },
  { x: 55, s: 3, d: 0.9, t: 5.6 },
  { x: 67, s: 5, d: 3.1, t: 4.6 },
  { x: 80, s: 4, d: 1.8, t: 5.8 },
  { x: 93, s: 6, d: 0.3, t: 5 },
];

/** where a card sits relative to the front one: centre, right, left, or hidden behind */
function slot(i: number, index: number): "is-c" | "is-r" | "is-l" | "is-b" {
  const n = PICKS.length;
  let d = (i - index + n) % n;
  if (d > n / 2) d -= n;
  if (d === 0) return "is-c";
  if (d === 1) return "is-r";
  if (d === -1) return "is-l";
  return "is-b";
}

/**
 * A 3D coverflow deck: the best items are photo cards, one big in the middle, the others tilted
 * at the sides. Every few seconds the deck turns and the next card swings to the front.
 * Purely decorative, so it is hidden from screen readers.
 */
export default function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // move on to the next item every few seconds (stays still for reduced-motion users)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % PICKS.length), CYCLE_MS);
    return () => window.clearTimeout(t);
  }, [index]);

  // the deck leans a little towards the mouse (desktop only)
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

  const style = {
    "--accent": PICKS[index].accent,
    "--move": `${MOVE_MS}ms`,
    "--hold": `${CYCLE_MS - MOVE_MS}ms`,
  } as CSSProperties;

  return (
    <div className="hero__stage" ref={stageRef} style={style} aria-hidden="true">
      {PICKS.map((p, i) => (
        <div key={`a${p.word}`} className={`hero__aura${i === index ? " is-on" : ""}`} style={{ "--accent": p.accent } as CSSProperties} />
      ))}

      {PICKS.map((p, i) => (
        <div key={`w${p.word}`} className={`hero__word${i === index ? " is-on" : ""}`} style={{ "--accent": p.accent } as CSSProperties}>
          {p.word}
        </div>
      ))}

      <div className="hero__sparks">
        {SPARKS.map((sp) => (
          <i
            key={sp.x}
            style={{ left: `${sp.x}%`, width: sp.s, height: sp.s, animationDelay: `${sp.d}s`, animationDuration: `${sp.t}s` }}
          />
        ))}
      </div>

      <span className="hero__floor" />

      <div className="hero__deck">
        <span className="hero__disc" />
        <span className="hero__disc hero__disc--b" />

        {PICKS.map((p, i) => {
          let letter = 0;
          return (
            <figure key={p.title} className={`hero__card ${slot(i, index)}`} style={{ "--accent": p.accent } as CSSProperties}>
              <img src={p.image} alt="" draggable={false} style={{ objectPosition: p.focus }} />
              <figcaption>
                <small>{p.tag}</small>
                <strong>
                  {p.title.split(" ").map((word, w) => (
                    <span className="hero__w" key={w}>
                      {word.split("").map((ch) => (
                        <span className="hero__ch" key={letter} style={{ "--i": letter++ } as CSSProperties}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  ))}
                </strong>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="hero__meter">
        <b>{pad(index + 1)}</b>
        <span className="hero__bar">
          <i key={index} />
        </span>
        <em>{pad(PICKS.length)}</em>
      </div>
    </div>
  );
}
