import { useEffect, useRef, useState } from "react";
import { FaPhoneAlt, FaShoppingBag, FaTimes } from "react-icons/fa";
import { useCart } from "../cart/CartContext";
import { SERVICES, SITE } from "../data/content";
import { DELIVERY_CHARGE, fallbackFor } from "../data/menu";
import type { Dish } from "../data/menu";
import QtyStepper from "./QtyStepper";

interface Props {
  dish: Dish;
  categoryId: string;
  categoryTitle: string;
  onClose: () => void;
}

export default function DishModal({ dish, categoryId, categoryTitle, onClose }: Props) {
  const { add } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState(1);

  // bigger photo first, then the original, then the local picture
  const sources = Array.from(
    new Set(
      [dish.image?.replace(/tr-(180|280)xauto/, "tr-560xauto"), dish.image].filter((s): s is string =>
        Boolean(s)
      )
    )
  );
  const fallback = fallbackFor(categoryId);
  const remote = step < sources.length;
  const src = remote ? sources[step] : fallback.src;
  const round = !remote && fallback.round;

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

  const addToCart = () => {
    add(
      {
        key: `${categoryId}:${dish.name}`,
        name: dish.name,
        category: categoryTitle,
        price: dish.price,
        from: dish.from,
        image: dish.image ?? fallback.src,
      },
      qty
    );
    onClose();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={dish.name} onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        <div className={`modal__media ${remote ? "" : "is-fallback"}`}>
          <span className="modal__chip">{categoryTitle}</span>
          <img
            src={src}
            alt={dish.name}
            className={round ? "is-round" : ""}
            referrerPolicy="no-referrer"
            onError={() => remote && setStep((s) => s + 1)}
          />
        </div>

        <div className="modal__body">
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

          <div className="modal__buy">
            <div className="modal__qty">
              <span>Quantity</span>
              <QtyStepper value={qty} onChange={setQty} />
            </div>
            <div className="modal__total">
              <span>{dish.from ? "Starting at" : "Total"}</span>
              <strong>৳{qty * dish.price}</strong>
            </div>
          </div>

          <button className="btn btn--red modal__add" onClick={addToCart}>
            <FaShoppingBag aria-hidden /> Add to Cart
          </button>

          <div className="modal__foot">
            <a href={SITE.phoneHref}>
              <FaPhoneAlt aria-hidden /> Prefer to call? {SITE.phone}
            </a>
            <span>Delivery charge ৳{DELIVERY_CHARGE}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
