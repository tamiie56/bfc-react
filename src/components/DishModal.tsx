import { useEffect, useRef, useState } from "react";
import { FaArrowRight, FaPhoneAlt, FaTimes } from "react-icons/fa";
import chicken from "../assets/images/1.png";
import burger from "../assets/images/2.png";
import rice from "../assets/images/3.png";
import sides from "../assets/images/4.png";
import combo from "../assets/images/ab2.png";
import { SERVICES, SITE } from "../data/content";
import { DELIVERY_CHARGE } from "../data/menu";
import type { Dish } from "../data/menu";

/** Local picture used when an item has no photo of its own */
const FALLBACK: Record<string, { src: string; round: boolean }> = {
  "fried-chicken": { src: chicken, round: true },
  "chicken-wings": { src: chicken, round: true },
  "chicken-delight": { src: chicken, round: true },
  "chicken-burger": { src: burger, round: true },
  "rice-items": { src: rice, round: true },
  "rice-meal": { src: rice, round: true },
  "side-menu": { src: sides, round: true },
  beverage: { src: sides, round: true },
  "chicken-wrap": { src: burger, round: true },
};
const DEFAULT_FALLBACK = { src: combo, round: false };

interface Props {
  dish: Dish;
  categoryId: string;
  categoryTitle: string;
  onClose: () => void;
}

export default function DishModal({ dish, categoryId, categoryTitle, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);

  // try a bigger version of the photo first, then the original, then the local picture
  const sources = Array.from(
    new Set(
      [
        dish.image?.replace(/tr-(180|280)xauto/, "tr-560xauto"),
        dish.image,
      ].filter((s): s is string => Boolean(s))
    )
  );
  const fallback = FALLBACK[categoryId] ?? DEFAULT_FALLBACK;
  const remote = step < sources.length;
  const src = remote ? sources[step] : fallback.src;
  const round = remote ? false : fallback.round;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={dish.name} onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        <div className="modal__media">
          <img
            src={src}
            alt={dish.name}
            className={`${round ? "is-round" : ""} ${!remote && !round ? "is-contain" : ""}`}
            referrerPolicy="no-referrer"
            onError={() => remote && setStep((s) => s + 1)}
          />
        </div>

        <div className="modal__body">
          <span className="modal__cat">{categoryTitle}</span>
          <h2>{dish.name}</h2>
          <div className="modal__price">
            {dish.from && <small>From</small>}৳{dish.price}
          </div>
          {dish.desc && <p className="modal__desc">{dish.desc}</p>}

          <ul className="modal__tags">
            {SERVICES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          <div className="modal__cta">
            <a href={SITE.menuOrderUrl} target="_blank" rel="noreferrer" className="btn btn--red">
              Order Now <FaArrowRight aria-hidden />
            </a>
            <a href={SITE.phoneHref} className="btn btn--ghost">
              <FaPhoneAlt aria-hidden /> {SITE.phone}
            </a>
          </div>
          <p className="modal__note">Delivery charge: ৳{DELIVERY_CHARGE}</p>
        </div>
      </div>
    </div>
  );
}
