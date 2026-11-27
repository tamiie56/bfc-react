import type { CSSProperties } from "react";
import { HERO_SLIDES } from "../data/heroSlides";

interface Props {
  index: number;
  /** the slide that is leaving (null on the very first render) */
  prev: number | null;
}

/**
 * The current item on a round plate (same look as the "What kind of Foods we serve" section).
 * The new photo is wiped in from the left to the right while the old one lifts away upwards.
 * Purely decorative, so it is hidden from screen readers.
 */
export default function HeroShowcase({ index, prev }: Props) {
  const slide = HERO_SLIDES[index];

  return (
    <div className="hero__shots" style={{ "--accent": slide.accent } as CSSProperties} aria-hidden="true">
      <div className="hero__blinds">
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.title}
            className={`hero__shot${i === index ? " is-on" : i === prev ? " is-prev" : ""}`}
            style={{ "--img": `url(${s.image})`, "--pos": s.focus } as CSSProperties}
          >
            <i />
          </div>
        ))}
      </div>

      <span key={`r${index}`} className="hero__ribbon">
        {slide.tag}
      </span>
    </div>
  );
}
