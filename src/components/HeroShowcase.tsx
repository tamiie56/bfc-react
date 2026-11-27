import { useEffect, useRef, type CSSProperties } from "react";
import { HERO_SLIDES } from "../data/heroSlides";

interface Props {
  index: number;
  /** the slide that is leaving (null on the very first render) */
  prev: number | null;
}

/** sauce drips: position (%), width (% of plate), how far they run (% of plate), start delay (s), speed (s) */
const DRIPS = [
  { x: 6, w: 7, len: 17, d: 0.9, t: 3.4 },
  { x: 17, w: 5, len: 30, d: 1.4, t: 4.4 },
  { x: 29, w: 8, len: 21, d: 0.6, t: 3.8 },
  { x: 43, w: 5, len: 38, d: 1.8, t: 5 },
  { x: 55, w: 9, len: 24, d: 1.1, t: 4 },
  { x: 69, w: 5, len: 33, d: 1.6, t: 4.6 },
  { x: 80, w: 7, len: 19, d: 0.8, t: 3.6 },
  { x: 91, w: 6, len: 27, d: 1.3, t: 4.2 },
];

/** crumbs & spice flying out of the plate: angle (deg), distance (% of plate), size (px), fall (% of plate) */
const CRUMBS = Array.from({ length: 22 }, (_, i) => {
  const a = (i * 137.5) % 360; // golden-angle spread, looks random but stays stable between renders
  return {
    a,
    r: 58 + ((i * 29) % 46),
    s: 4 + ((i * 7) % 8),
    f: 18 + ((i * 13) % 34),
    d: (i % 9) * 0.07,
    spice: i % 4 === 0,
  };
});

/**
 * The current item on a round plate (same look as the "What kind of Foods we serve" section).
 * The new photo is feathered in from the left to the right while the old one lifts upwards and melts away.
 * Hot sauce drips slowly down over the plate and crispy crumbs fly out on every change; both react to scrolling.
 * Purely decorative, so it is hidden from screen readers.
 */
export default function HeroShowcase({ index, prev }: Props) {
  const slide = HERO_SLIDES[index];
  const rootRef = useRef<HTMLDivElement>(null);

  // scrolling down makes the sauce run further and the crumbs spread wider
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const hero = el.closest(".hero") as HTMLElement | null;
      const h = hero ? hero.offsetHeight : window.innerHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.85)));
      el.style.setProperty("--sp", p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="hero__shots" style={{ "--accent": slide.accent } as CSSProperties} aria-hidden="true">
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

        {/* hot sauce running down from the top edge of the plate */}
        <div className="hero__sauce" key={`s${index}`}>
          <span className="hero__sauceCap" />
          {DRIPS.map((d, i) => (
            <span
              key={i}
              className="hero__drip"
              style={{ "--x": `${d.x}%`, "--w": `${d.w}%`, "--len": `${d.len}%`, "--d": `${d.d}s`, "--t": `${d.t}s` } as CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* crunch: crumbs and spice burst out of the plate in slow motion */}
      <div className="hero__crumbs" key={`c${index}`}>
        {CRUMBS.map((c, i) => (
          <i
            key={i}
            className={c.spice ? "is-spice" : undefined}
            style={
              {
                "--dx": `${Math.cos((c.a * Math.PI) / 180) * c.r}%`,
                "--dy": `${Math.sin((c.a * Math.PI) / 180) * c.r}%`,
                "--fall": `${c.f}%`,
                "--s": `${c.s}px`,
                "--rot": `${(i * 53) % 360}deg`,
                "--cd": `${0.25 + c.d}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {prev !== null && (
        <span key={`o${prev}`} className="hero__ribbon is-out">
          {HERO_SLIDES[prev].tag}
        </span>
      )}
      <span key={`r${index}`} className="hero__ribbon">
        {slide.tag}
      </span>
    </div>
  );
}
