import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { GALLERY } from "../data/content";
import { delay } from "../utils/style";

export default function Gallery() {
  const [current, setCurrent] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => setCurrent(null), []);
  const move = useCallback(
    (dir: 1 | -1) =>
      setCurrent((c) => (c === null ? c : (c + dir + GALLERY.length) % GALLERY.length)),
    []
  );

  useEffect(() => {
    if (current === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [current, close, move]);

  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  return (
    <section className="gallery section" id="gallery">
      <div className="container">
        <span className="eyebrow reveal">Fresh from the kitchen</span>
        <h2 className="section-title reveal">Our Gallery</h2>

        <div className="gallery__grid">
          {GALLERY.map((g, i) => (
            <button
              key={g.title}
              className={`g g--${g.shape} reveal reveal--zoom`}
              style={delay((i % 4) * 90)}
              onClick={() => setCurrent(i)}
              aria-label={`Open ${g.title}`}
            >
              <img src={g.src} alt={g.title} loading="lazy" decoding="async" />
              <span className="g__caption">{g.title}</span>
            </button>
          ))}
        </div>
      </div>

      {current !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          onClick={close}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={onTouchEnd}
        >
          <figure className="lightbox__fig" key={current} onClick={(e) => e.stopPropagation()}>
            <img src={GALLERY[current].src} alt={GALLERY[current].title} />
            <figcaption>
              {GALLERY[current].title}
              <span>
                {current + 1} / {GALLERY.length}
              </span>
            </figcaption>
          </figure>
          <button className="lightbox__btn lightbox__close" onClick={close} aria-label="Close">
            <FaTimes />
          </button>
          <button
            className="lightbox__btn lightbox__prev"
            onClick={(e) => {
              e.stopPropagation();
              move(-1);
            }}
            aria-label="Previous"
          >
            <FaChevronLeft />
          </button>
          <button
            className="lightbox__btn lightbox__next"
            onClick={(e) => {
              e.stopPropagation();
              move(1);
            }}
            aria-label="Next"
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
