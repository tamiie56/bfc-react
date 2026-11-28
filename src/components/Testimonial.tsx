import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { FaRegStar, FaStar } from "react-icons/fa";
import { usePublicReviews } from "../admin/store";
import type { PublicReview } from "../admin/store";
import reviewImg from "../assets/images/review.jpg";
import { REVIEW } from "../data/content";
import { useParallax } from "../hooks/useParallax";

/** shown only until the team picks feedback in the admin panel */
const FALLBACK: PublicReview = { id: "default", name: REVIEW.name, message: REVIEW.text, rating: Math.round(REVIEW.rating) };

const MAX_CELLS = 8; // 4 x 2 grid on desktop
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

/**
 * How many cubes to show. There is always at least one feedback that is NOT on screen,
 * so a cube can turn to it and the same feedback is never shown twice at once.
 * 9+ feedbacks -> 8 cubes, 5-8 -> 4 cubes, 4 -> 3, 3 -> 2, 2 -> 1 (it just flips between the two).
 */
function cellCount(n: number): number {
  if (n >= MAX_CELLS + 1) return MAX_CELLS;
  if (n >= 5) return 4;
  return Math.max(1, n - 1);
}

function initCells(n: number): Cell[] {
  return Array.from({ length: cellCount(n) }, (_, i) => ({ cur: i % n, next: null, flip: false }));
}

/** the cubes that touch this one (same row / same column of the grid) */
function neighbours(at: number, len: number): number[] {
  const cols = Math.min(4, len);
  const out: number[] = [];
  if (at % cols > 0) out.push(at - 1);
  if (at % cols < cols - 1 && at + 1 < len) out.push(at + 1);
  if (at - cols >= 0) out.push(at - cols);
  if (at + cols < len) out.push(at + cols);
  return out;
}

/**
 * Which cube turns now, and to which feedback.
 * 1) never a feedback that is already on screen while another one is not (no repeats),
 * 2) among those, the one whose colour differs from the old face and from the touching cubes.
 * It looks at the cubes in the criss-cross order and takes the first one with a clear colour change.
 */
function chooseFlip(cells: Cell[], start: number, n: number): { at: number; next: number; step: number } | null {
  if (n < 2) return null;
  const shown = new Array<number>(n).fill(0);
  cells.forEach((c) => {
    shown[c.cur % n] += 1;
    if (c.next !== null) shown[c.next % n] += 1;
  });

  let best: { at: number; next: number; step: number; pen: number } | null = null;
  for (let k = 0; k < ORDER.length; k++) {
    const at = ORDER[(start + k) % ORDER.length] % cells.length;
    if (cells[at].next !== null) continue;
    const cur = cells[at].cur % n;

    let least = Infinity;
    let pool: number[] = [];
    for (let s = 0; s < n; s++) {
      if (s === cur) continue;
      if (shown[s] < least) {
        least = shown[s];
        pool = [s];
      } else if (shown[s] === least) pool.push(s);
    }
    if (pool.length === 0) continue;

    const around = neighbours(at, cells.length).map((j) => tone((cells[j].next ?? cells[j].cur) % n));
    for (const s of pool) {
      const pen = (tone(s) === tone(cur) ? 3 : 0) + around.filter((t) => t === tone(s)).length;
      if (!best || pen < best.pen) best = { at, next: s, step: start + k + 1, pen };
    }
    if (best && best.pen === 0) break;
  }
  return best;
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
  const slides = useMemo(() => {
    if (!picked || picked.length === 0) return [FALLBACK];
    // the same person with the same words twice is one feedback, not two
    const seen = new Set<string>();
    return picked.filter((r) => {
      const k = `${r.name.trim().toLowerCase()}|${r.message.trim().toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [picked]);
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
      const choice = chooseFlip(cs, step, n);
      if (!choice) return;
      const { at, next } = choice;
      step = choice.step;
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
        <div
          className={`fg reveal ${cells.length === 1 ? "fg--single" : ""}`}
          style={{ "--cols": Math.min(4, cells.length) } as CSSProperties}
          role="list"
          aria-label="What our customers say"
        >
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
