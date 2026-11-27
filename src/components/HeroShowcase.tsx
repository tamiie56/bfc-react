import type { CSSProperties } from "react";
import { HERO_SLIDES } from "../data/heroSlides";

/** number of vertical strips the photo is cut into */
const STRIPS = 7;
const STRIP_IDS = Array.from({ length: STRIPS }, (_, i) => i);

/** a fixed set of sparks (x offset in %, size in px, delay and duration in s) - no randomness during render */
const SPARKS = [
  { x: 6, s: 5, d: 0, t: 5.2 },
  { x: 19, s: 3, d: 1.4, t: 4.4 },
  { x: 33, s: 6, d: 0.6, t: 6 },
  { x: 48, s: 4, d: 2.3, t: 4.8 },
  { x: 62, s: 3, d: 0.9, t: 5.6 },
  { x: 76, s: 5, d: 3.1, t: 4.6 },
  { x: 90, s: 6, d: 0.3, t: 5 },
];

interface Props {
  index: number;
  /** the slide that is leaving (null on the very first render) */
  prev: number | null;
}

/**
 * The photo of the current item. It is cut into vertical strips (like window blinds): the strips
 * of the new photo rise up one after another while the old strips lift away.
 * Purely decorative, so it is hidden from screen readers.
 */
export default function HeroShowcase({ index, prev }: Props) {
  const slide = HERO_SLIDES[index];

  return (
    <div className="hero__shots" style={{ "--accent": slide.accent } as CSSProperties} aria-hidden="true">
      {HERO_SLIDES.map((s, i) => (
        <div key={s.word} className={`hero__word${i === index ? " is-on" : ""}`} style={{ "--accent": s.accent } as CSSProperties}>
          {s.word}
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

      <div className="hero__blinds">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.title}
            className={`hero__shot${i === index ? " is-on" : i === prev ? " is-prev" : ""}`}
            style={{ "--img": `url(${s.image})`, "--pos": s.focus } as CSSProperties}
          >
            {STRIP_IDS.map((n) => (
              <span className="hero__strip" key={n} style={{ "--s": n } as CSSProperties}>
                <i />
              </span>
            ))}
          </div>
        ))}
      </div>

      <span key={`r${index}`} className="hero__ribbon">
        {slide.tag}
      </span>
    </div>
  );
}
