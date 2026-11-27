import { useEffect, useState, type CSSProperties } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { HERO_SLIDES } from "../data/heroSlides";
import { useParallax } from "../hooks/useParallax";
import { delay } from "../utils/style";
import HeroShowcase from "./HeroShowcase";
import OpenStatus from "./OpenStatus";

/** time one slide stays on screen before the whole hero moves on (ms) */
const CYCLE_MS = 5800;
/** time the photo strips take to swap (ms) - keep in sync with --move in the CSS */
const MOVE_MS = 900;

const pad = (n: number) => String(n).padStart(2, "0");

export default function Hero() {
  const mediaRef = useParallax<HTMLDivElement>(0.3);
  const [slide, setSlide] = useState<{ index: number; prev: number | null }>({ index: 0, prev: null });

  // the whole hero (background, text, colours, photo) moves on every few seconds
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(
      () => setSlide((s) => ({ index: (s.index + 1) % HERO_SLIDES.length, prev: s.index })),
      CYCLE_MS
    );
    return () => window.clearTimeout(t);
  }, [slide.index]);

  const { index, prev } = slide;
  const current = HERO_SLIDES[index];
  let letter = 0;

  const style = {
    "--accent": current.accent,
    "--move": `${MOVE_MS}ms`,
    "--hold": `${CYCLE_MS - MOVE_MS}ms`,
  } as CSSProperties;

  return (
    <section className="hero" id="home" style={style}>
      <div className="hero__media" ref={mediaRef}>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.title}
            className={`hero__bg${i === index ? " is-on" : ""}`}
            style={{ "--img": `url(${s.bg})`, "--pos": s.bgFocus, "--blur": `${s.blur}px`, "--accent": s.accent } as CSSProperties}
          />
        ))}
      </div>

      {/* diagonal light that sweeps across the hero whenever the slide changes */}
      {prev !== null && <span key={`sw${index}`} className="hero__sweep" aria-hidden="true" />}

      <div className="container hero__inner">
        <span className="hero__chip rise" style={delay(150)}>
          Since 2002 · Bangladesh&apos;s largest local fast-food chain
        </span>

        <h1 className="hero__title">
          <span className="hero__bfc rise" style={delay(300)}>BFC</span>
          <span className="hero__full rise" style={delay(480)}>(Best Fried Chicken)</span>
        </h1>

        <div className="hero__now rise" style={delay(650)}>
          <div className="hero__nowtop">
            <span>Now serving</span>
            <b>{pad(index + 1)}</b>
            <i className="hero__nowbar">
              <u key={index} />
            </i>
            <em>{pad(HERO_SLIDES.length)}</em>
          </div>

          <h2 className="hero__nowtitle" key={`t${index}`}>
            {current.title.split(" ").map((word, w) => (
              <span className="hero__w" key={w}>
                {word.split("").map((ch) => (
                  <span className="hero__ch" key={letter} style={{ "--i": letter++ } as CSSProperties}>
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h2>

          <p className="hero__nowdesc" key={`d${index}`}>
            {current.desc}
          </p>
        </div>

        <div className="hero__cta rise" style={delay(800)}>
          <Link to="/menu" className="btn btn--red">
            Order Now <FaArrowRight aria-hidden />
          </Link>
          <a href="#services" className="btn btn--ghost">
            Explore Foods
          </a>
        </div>

        <div className="rise" style={delay(950)}>
          <OpenStatus />
        </div>
      </div>

      <HeroShowcase index={index} prev={prev} />
    </section>
  );
}
