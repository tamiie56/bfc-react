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
const TICK = 2000; // a new cube turns this often
const FLIP_MS = 900; // must match the transition in .fg__cube.is-flip
/** which cube turns next: criss-cross, so neighbours do not turn one after the other */
const ORDER = [0, 5, 2, 7, 1, 4, 3, 6];

interface Cell {
  cur: number; // index of the feedback showing now
  next: number | null; // index of the feedback turning in from below
}

function initCells(n: number): Cell[] {
  const total = n === 1 ? 1 : CELLS;
  let shift = n >= CELLS ? 0 : Math.max(1, Math.floor(n / 2));
  if (shift > 0 && (4 + shift) % n === 0) shift += 1; // the second row must not repeat the first one
  return Array.from({ length: total }, (_, i) => ({ cur: (i + (i >= 4 ? shift : 0)) % n, next: null }));
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
  let best = Infinity;
  let pool: number[] = [];
  for (let s = 0; s < n; s++) {
    if (s === cur) continue;
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
    let step = 0;
    const tick = setInterval(() => {
      if (document.hidden) return;
      const cs = cellsRef.current;
      if (cs.length < 2) return;
      const at = ORDER[step++ % ORDER.length] % cs.length;
      if (cs[at].next !== null) return;
      const next = pickNext(cs, at, n);
      if (next === null) return;
      setCells((prev) => prev.map((c, i) => (i === at ? { ...c, next } : c)));
      const t = window.setTimeout(() => {
        timers.delete(t);
        setCells((prev) => prev.map((c, i) => (i === at && c.next !== null ? { cur: c.next, next: null } : c)));
      }, FLIP_MS + 60);
      timers.add(t);
    }, TICK);
    return () => {
      clearInterval(tick);
      timers.forEach((t) => clearTimeout(t));
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
              <div className={`fg__cube ${c.next !== null ? "is-flip" : ""}`}>
                <div className="fg__face fg__face--front">
                  <Face r={slides[c.cur % n]} />
                </div>
                {c.next !== null && (
                  <div className="fg__face fg__face--bottom" aria-hidden>
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
