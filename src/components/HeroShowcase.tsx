import { useEffect, useRef, useState, type CSSProperties } from "react";
import combo from "../assets/images/ab2.png";
import crispy from "../assets/images/g-crispy.jpg";
import drumstick from "../assets/images/g-drumstick.jpg";
import fries from "../assets/images/g-fries.jpg";

interface Pick {
  title: string;
  tag: string;
  /** big outlined word behind the frame */
  word: string;
  /** colour of the glow, frame, sparks and ribbon */
  accent: string;
  image: string;
  /** which part of the photo stays visible inside the tall frame */
  focus: string;
}

/** The best items shown in the hero, one after another. */
const PICKS: Pick[] = [
  { title: "Sauce-Dipped Crispy Chicken", tag: "Best Seller", word: "Crunchy", accent: "#ff7a1a", image: drumstick, focus: "50% 30%" },
  { title: "Golden Fries", tag: "Crowd Favourite", word: "Golden", accent: "#ffc80a", image: fries, focus: "50% 50%" },
  { title: "Crispy Chicken Pieces", tag: "Signature Taste", word: "Juicy", accent: "#ff4d2e", image: crispy, focus: "30% 50%" },
  { title: "BFC Combo Meal", tag: "Best Value", word: "Combo", accent: "#f0a30a", image: combo, focus: "50% 50%" },
];

/** how long each item stays on screen once it has been revealed (ms) */
const HOLD_MS = 4200;
/** length of the reveal / wipe-out animations (ms) - keep in sync with the CSS */
const IN_MS = 1100;
const OUT_MS = 700;

const STAMP_TEXT = "BEST FRIED CHICKEN \u2022 SINCE 2002 \u2022 ";

/** a fixed set of sparks (x offset in %, size in px, delay and duration in s) - no randomness during render */
const SPARKS = [
  { x: 8, s: 5, d: 0, t: 5.2 },
  { x: 20, s: 3, d: 1.4, t: 4.4 },
  { x: 31, s: 6, d: 0.6, t: 6 },
  { x: 44, s: 4, d: 2.3, t: 4.8 },
  { x: 57, s: 3, d: 0.9, t: 5.6 },
  { x: 68, s: 5, d: 3.1, t: 4.6 },
  { x: 79, s: 4, d: 1.8, t: 5.8 },
  { x: 92, s: 6, d: 0.3, t: 5 },
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * An arch-shaped photo frame: the item is revealed from the bottom up, holds for a few seconds
 * while a line fills beside it, then is wiped away upwards and replaced by the next one.
 * Purely decorative, so it is hidden from screen readers.
 */
export default function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const stageRef = useRef<HTMLDivElement>(null);

  // reveal -> hold -> wipe out -> next item
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

  // the frame leans a little towards the mouse (desktop only)
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
  let letter = 0;

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

      <div className="hero__tilt">
        {/* outline of the arch, a little off to the side */}
        <span key={`o${index}`} className={`hero__outline is-${phase}`} />

        <div key={`a${index}`} className={`hero__arch is-${phase}`}>
          <img src={pick.image} alt="" draggable={false} style={{ objectPosition: pick.focus }} />
        </div>

        <span key={`r${index}`} className={`hero__ribbon is-${phase}`}>
          {pick.tag}
        </span>

        <span key={`l${index}`} className={`hero__line is-${phase}`}>
          <i />
        </span>

        <span className="hero__count">
          <b>{pad(index + 1)}</b>/{pad(PICKS.length)}
        </span>

        <svg className="hero__stamp" viewBox="0 0 120 120">
          <defs>
            <path id="heroStampPath" d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0" />
          </defs>
          <circle cx="60" cy="60" r="58" className="hero__stamp-bg" />
          <text className="hero__stamp-ring">
            <textPath href="#heroStampPath" textLength="283" lengthAdjust="spacing">
              {STAMP_TEXT}
            </textPath>
          </text>
          <text x="60" y="71" textAnchor="middle" className="hero__stamp-core">
            BFC
          </text>
        </svg>
      </div>

      <div key={`c${index}`} className={`hero__caption is-${phase}`}>
        <strong>
          {pick.title.split(" ").map((word, w) => (
            <span className="hero__w" key={w}>
              {word.split("").map((ch) => (
                <span className="hero__ch" key={letter} style={{ "--i": letter++ } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </strong>
      </div>
    </div>
  );
}
