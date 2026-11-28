import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaRegStar, FaStar } from "react-icons/fa";
import { usePublicReviews } from "../admin/store";
import type { PublicReview } from "../admin/store";
import reviewImg from "../assets/images/review.jpg";
import { REVIEW } from "../data/content";
import { useParallax } from "../hooks/useParallax";

/** shown only until the team picks feedback in the admin panel */
const FALLBACK: PublicReview = { id: "default", name: REVIEW.name, message: REVIEW.text, rating: Math.round(REVIEW.rating) };

const CELLS = 8; // 4 x 2 grid on desktop
const TICK = 2400; // a new cube turns this often
const FLIP_MS = 1300; // must match the transition in .fg__cube.is-flip
/** which cube turns next: criss-cross, so neighbours do not turn one after the other */
const ORDER = [0, 5, 2, 7, 1, 4, 3, 6];
/** every feedback keeps its own brand colour (cream, red, yellow, dark), so a turning cube is easy to see */
const TONES = 4;
const tone = (i: number) => i % TONES;

interface Cell {
  cur: number; // index of the feedback showing now
  next: number | null; // index of the feedback turning in from below
  flip: boolean; // true once the next face is painted and the turn can start
}

function initCells(n: number): Cell[] {
  const total = n === 1 ? 1 : CELLS;
  let shift = n >= CELLS ? 0 : Math.max(1, Math.floor(n / 2));
  if (shift > 0 && (4 + shift) % n === 0) shift += 1; // the second row must not repeat the first one
  return Array.from({ length: total }, (_, i) => ({ cur: (i + (i >= 4 ? shift : 0)) % n, next: null, flip: false }));
}

/** the feedback shown the least right now (never the one already in this cube) */
function pickNext(cells: Cell[], at: number, n: number): number | null {
  if (n < 2) return null;
  const shown = new Array<number>(n).fill(0);
  cells.forEach((c) => {
    shown[c.cur % n] += 1;
    if (c.next !== null) shown[c.next % n] += 1;
  });
  const cur = cells[at].cur % n;
  // prefer a feedback with a different colour, so the turn always shows a colour change
  const diff = Array.from({ length: n }, (_, s) => s).some((s) => s !== cur && tone(s) !== tone(cur));
  let best = Infinity;
  let pool: number[] = [];
  for (let s = 0; s < n; s++) {
    if (s === cur) continue;
    if (diff && tone(s) === tone(cur)) continue;
    if (shown[s] < best) {
      best = shown[s];
      pool = [s];
    } else if (shown[s] === best) pool.push(s);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function Face({ r }: { r: PublicReview }) {
  return (
    <>
      {r.rating > 0 && (
        <ul className={`fg__stars ${r.rating === 1 ? "stars--low" : "stars--good"}`} aria-label={`${r.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, s) => (
            <li key={s}>{s < r.rating ? <FaStar /> : <FaRegStar />}</li>
          ))}
        </ul>
      )}
      <blockquote className="fg__text">“{r.message}”</blockquote>
      <figcaption className="fg__name">{r.name}</figcaption>
    </>
  );
}

export default function Testimonial() {
  const bgRef = useParallax<HTMLDivElement>(0.14);
  const picked = usePublicReviews();
  const slides = useMemo(() => (picked && picked.length > 0 ? picked : [FALLBACK]), [picked]);
  const n = slides.length;
  const key = slides.map((s) => s.id).join("|");

  const [cells, setCells] = useState<Cell[]>(() => initCells(n));
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  // the team added / removed feedback: start the grid again
  useEffect(() => {
    setCells(initCells(n));
  }, [key, n]);

  // one cube turns every TICK (it keeps going on hover)
  useEffect(() => {
    if (n < 2) return;
    const timers = new Set<number>();
    const rafs = new Set<number | (() => void)>();
    let step = 0;
    const tick = setInterval(() => {
      if (document.hidden) return;
      const cs = cellsRef.current;
      if (cs.length < 2) return;
      const at = ORDER[step++ % ORDER.length] % cs.length;
      if (cs[at].next !== null) return;
      const next = pickNext(cs, at, n);
      if (next === null) return;
      // 1) mount the incoming face first, so it is already painted when the turn starts
      setCells((prev) => prev.map((c, i) => (i === at ? { ...c, next, flip: false } : c)));
      // 2) two frames later start the turn (the transition never begins on a cold layer)
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setCells((prev) => prev.map((c, i) => (i === at && c.next !== null ? { ...c, flip: true } : c)));
        });
      });
      // 3) when the turn is over the new feedback becomes the front face
      const t = window.setTimeout(() => {
        timers.delete(t);
        setCells((prev) => prev.map((c, i) => (i === at && c.next !== null ? { cur: c.next, next: null, flip: false } : c)));
      }, FLIP_MS + 120);
      timers.add(t);
      rafs.add(raf1);
      rafs.add(() => cancelAnimationFrame(raf2));
    }, TICK);
    return () => {
      clearInterval(tick);
      timers.forEach((t) => clearTimeout(t));
      rafs.forEach((r) => (typeof r === "function" ? r() : cancelAnimationFrame(r)));
    };
  }, [key, n]);

  return (
    <section className="testimonials" id="testimonials">
      <div className="testimonials__bg" ref={bgRef}>
        <img src={reviewImg} alt="" loading="lazy" />
      </div>

      <div className="container-wide testimonials__inner">
        <div className={`fg reveal ${cells.length === 1 ? "fg--single" : ""}`} role="list" aria-label="What our customers say">
          {cells.map((c, i) => (
            <figure className="fg__cell" role="listitem" key={i}>
              <div className={`fg__cube ${c.flip ? "is-flip" : ""}`}>
                <div className={`fg__face fg__face--front fg__tone--${tone(c.cur % n)}`}>
                  <Face r={slides[c.cur % n]} />
                </div>
                {c.next !== null && (
                  <div className={`fg__face fg__face--bottom fg__tone--${tone((c.next ?? 0) % n)}`} aria-hidden>
                    <Face r={slides[c.next % n]} />
                  </div>
                )}
              </div>
            </figure>
          ))}
        </div>

        <div className="fg__cta">
          <Link to="/feedback" className="btn btn--ghost btn--sm">
            Send Feedback
          </Link>
        </div>
      </div>
    </section>
  );
}
