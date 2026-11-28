import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaQuoteLeft, FaRegStar, FaStar } from "react-icons/fa";
import { usePublicReviews } from "../admin/store";
import type { PublicReview } from "../admin/store";
import reviewImg from "../assets/images/review.jpg";
import { REVIEW } from "../data/content";
import { useParallax } from "../hooks/useParallax";

/** shown only until the team picks feedback in the admin panel */
const FALLBACK: PublicReview = { id: "default", name: REVIEW.name, message: REVIEW.text, rating: Math.round(REVIEW.rating) };

const INTERVAL = 6000;

export default function Testimonial() {
  const bgRef = useParallax<HTMLDivElement>(0.14);
  const picked = usePublicReviews();
  const slides = picked && picked.length > 0 ? picked : [FALLBACK];
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

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

  return (
    <section className="testimonials" id="testimonials">
      <div className="testimonials__bg" ref={bgRef}>
        <img src={reviewImg} alt="" loading="lazy" />
      </div>

      <div className="container testimonials__inner">
        <div
          className="review reviews reveal reveal--zoom"
          role="region"
          aria-roledescription="carousel"
          aria-label="What our customers say"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <FaQuoteLeft className="review__mark" aria-hidden />

          <div className="reviews__viewport">
            <div className="reviews__track" style={{ transform: `translateX(-${index * 100}%)` }} aria-live={paused ? "polite" : "off"}>
              {slides.map((r, i) => (
                <figure key={r.id} className={`reviews__slide ${i === index ? "is-active" : ""}`} aria-hidden={i !== index} aria-label={`${i + 1} of ${count}`}>
                  {r.rating > 0 && (
                    <ul className="stars" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <li key={s}>{s < r.rating ? <FaStar /> : <FaRegStar />}</li>
                      ))}
                    </ul>
                  )}
                  <blockquote className="review__text">{r.message}</blockquote>
                  <figcaption className="review__name">{r.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          {count > 1 && (
            <div className="reviews__nav">
              <button type="button" className="reviews__arrow" onClick={() => go(index - 1)} aria-label="Previous review">
                <FaChevronLeft aria-hidden />
              </button>
              <div className="reviews__dots">
                {slides.map((r, i) => (
                  <button key={r.id} type="button" className={i === index ? "is-active" : ""} onClick={() => go(i)} aria-label={`Show review ${i + 1}`} aria-current={i === index} />
                ))}
              </div>
              <button type="button" className="reviews__arrow" onClick={() => go(index + 1)} aria-label="Next review">
                <FaChevronRight aria-hidden />
              </button>
            </div>
          )}

          <Link to="/feedback" className="btn btn--ghost btn--sm">
            Send Feedback
          </Link>
        </div>
      </div>
    </section>
  );
}
