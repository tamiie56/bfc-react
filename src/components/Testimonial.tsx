import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, TouchEvent } from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaQuoteRight, FaRegStar, FaStar } from "react-icons/fa";
import { usePublicReviews } from "../admin/store";
import type { PublicReview } from "../admin/store";
import reviewImg from "../assets/images/review.jpg";
import { REVIEW } from "../data/content";
import { useParallax } from "../hooks/useParallax";

/** shown only until the team picks feedback in the admin panel */
const FALLBACK: PublicReview = { id: "default", name: REVIEW.name, message: REVIEW.text, rating: Math.round(REVIEW.rating) };

const INTERVAL = 6000;

/** how far (in cards) a slide sits from the active one, the short way round the loop */
function offsetOf(i: number, active: number, count: number): number {
  let o = (i - active + count) % count;
  if (o > count / 2) o -= count;
  return o;
}

export default function Testimonial() {
  const bgRef = useParallax<HTMLDivElement>(0.14);
  const picked = usePublicReviews();
  const slides = picked && picked.length > 0 ? picked : [FALLBACK];
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const prevOffsets = useRef<Record<string, number>>({});

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  // the team may have removed a slide while it was showing
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  // auto-play (off for people who asked for less motion, and while hovering / touching)
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(t);
  }, [count, paused, index]);

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    setPaused(false);
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  };

  const active = index >= count ? 0 : index;
  const offsets = slides.map((r, i) => ({ id: r.id, o: offsetOf(i, active, count) }));

  // a card that wraps from one edge to the other jumps there instead of flying across the stage
  const jumped = new Set(offsets.filter(({ id, o }) => id in prevOffsets.current && Math.abs(o - prevOffsets.current[id]) > 1).map((x) => x.id));
  useEffect(() => {
    prevOffsets.current = Object.fromEntries(offsets.map(({ id, o }) => [id, o]));
  });

  return (
    <section className="testimonials" id="testimonials">
      <div className="testimonials__bg" ref={bgRef}>
        <img src={reviewImg} alt="" loading="lazy" />
      </div>

      <div className="container testimonials__inner">
        <div
          className="rv reveal reveal--zoom"
          role="region"
          aria-roledescription="carousel"
          aria-label="What our customers say"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="rv__stage" aria-live={paused ? "polite" : "off"}>
            {slides.map((r, i) => {
              const o = offsets[i].o;
              const abs = Math.abs(o);
              const initial = Array.from(r.name.trim())[0]?.toUpperCase() ?? "B";
              return (
                <figure
                  key={r.id}
                  className={`rv__card ${i === active ? "is-active" : ""} ${jumped.has(r.id) ? "is-jump" : ""}`}
                  style={{ "--o": o, "--abs": abs, zIndex: 10 - abs } as CSSProperties}
                  data-abs={abs > 2 ? 3 : abs}
                  aria-hidden={i !== active}
                  aria-label={`${i + 1} of ${count}`}
                  onClick={i !== active && abs <= 2 ? () => go(i) : undefined}
                >
                  <FaQuoteRight className="rv__mark" aria-hidden />
                  {r.rating > 0 && (
                    <ul className={`rv__stars ${r.rating === 1 ? "stars--low" : "stars--good"}`} aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <li key={s}>{s < r.rating ? <FaStar /> : <FaRegStar />}</li>
                      ))}
                    </ul>
                  )}
                  <blockquote className="rv__text">“{r.message}”</blockquote>
                  <figcaption className="rv__who">
                    <span className="rv__avatar" aria-hidden>{initial}</span>
                    <span className="rv__meta">
                      <strong>{r.name}</strong>
                      <small>BFC customer</small>
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {count > 1 && (
            <>
              <button type="button" className="rv__arrow rv__arrow--prev" onClick={() => go(active - 1)} aria-label="Previous review">
                <FaChevronLeft aria-hidden />
              </button>
              <button type="button" className="rv__arrow rv__arrow--next" onClick={() => go(active + 1)} aria-label="Next review">
                <FaChevronRight aria-hidden />
              </button>
              <div className="rv__dots">
                {slides.map((r, i) => (
                  <button key={r.id} type="button" className={i === active ? "is-active" : ""} onClick={() => go(i)} aria-label={`Show review ${i + 1}`} aria-current={i === active} />
                ))}
              </div>
            </>
          )}

          <div className="rv__cta">
            <Link to="/feedback" className="btn btn--ghost btn--sm">
              Send Feedback
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
