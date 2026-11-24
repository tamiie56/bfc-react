import { useEffect, useRef, useState } from "react";
import { FaBolt, FaBoxOpen, FaCalendarCheck, FaMobileAlt, FaMotorcycle, FaPhoneAlt, FaShoppingBag, FaTimes, FaUtensils } from "react-icons/fa";
import type { IconType } from "react-icons";
import { useCart } from "../cart/CartContext";
import { ORDER_TYPES, isDelivery } from "../cart/order";
import type { OrderType } from "../cart/order";
import { SITE } from "../data/content";
import { DELIVERY_CHARGE, PLACEHOLDER, dishImage } from "../data/menu";
import type { Dish } from "../data/menu";
import BookingForm from "./BookingForm";
import QtyStepper from "./QtyStepper";

interface Props {
  dish: Dish;
  categoryId: string;
  categoryTitle: string;
  onClose: () => void;
}

const TYPE_ICONS: Record<OrderType, IconType> = {
  "Online Order": FaMobileAlt,
  "Online Delivery": FaMotorcycle,
  "Take Away": FaBoxOpen,
  "Dine-in": FaUtensils,
};

const TYPE_HINTS: Record<OrderType, string> = {
  "Online Order": "Order now, we confirm by call",
  "Online Delivery": "Delivered to your door",
  "Take Away": "Pick up at the outlet",
  "Dine-in": "Book a table at the outlet",
};

export default function DishModal({ dish, categoryId, categoryTitle, onClose }: Props) {
  const { add, orderNow, orderType, setOrderType } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState(1);
  const [booking, setBooking] = useState(false);

  // bigger photo first, then the original; if neither loads (or there is none) show the logo
  const photo = dishImage(dish);
  const sources = Array.from(
    new Set(
      [photo?.replace(/tr-(180|280)xauto/, "tr-560xauto"), photo].filter((s): s is string => Boolean(s))
    )
  );
  const hasPhoto = step < sources.length;
  const src = hasPhoto ? sources[step] : PLACEHOLDER;

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

  const line = {
    key: `${categoryId}:${dish.name}`,
    name: dish.name,
    category: categoryTitle,
    price: dish.price,
    from: dish.from,
    image: photo ?? PLACEHOLDER,
  };

  const addToCart = () => {
    add(line, qty);
    onClose();
  };

  // single-item checkout: the cart is left as it is
  const orderThisNow = () => {
    orderNow(line, qty);
    onClose();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={dish.name} onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal__close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        <div className={`modal__media ${hasPhoto ? "" : "is-fallback"}`}>
          <span className="modal__chip">{categoryTitle}</span>
          <img
            src={src}
            alt={dish.name}
            className={hasPhoto ? "" : "is-logo"}
            referrerPolicy="no-referrer"
            onError={() => hasPhoto && setStep((s) => s + 1)}
          />
          {!hasPhoto && <span className="modal__ph">Photo coming soon</span>}
        </div>

        <div className="modal__body">
          <h2>{dish.name}</h2>

          <div className="modal__price">
            {dish.from && <small>From</small>}
            <span>৳{dish.price}</span>
          </div>

          {dish.desc && <p className="modal__desc">{dish.desc}</p>}

          {booking ? (
            <BookingForm dishName={dish.name} onBack={() => setBooking(false)} onClose={onClose} />
          ) : (
            <>

          <fieldset className="modal__types">
            <legend>How would you like to order?</legend>
            <div className="modal__typeGrid">
              {ORDER_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t];
                const active = orderType === t;
                return (
                  <label key={t} className={active ? "is-active" : ""}>
                    <input
                      type="radio"
                      name="dishOrderType"
                      value={t}
                      checked={active}
                      onChange={() => setOrderType(t)}
                    />
                    <Icon aria-hidden />
                    <span className="modal__typeText">
                      <b>{t}</b>
                      <em>{TYPE_HINTS[t]}</em>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {orderType === "Dine-in" ? (
            <div className="modal__dine">
              <p>Dining in? Reserve a table and we will have it ready for you.</p>
              <button type="button" className="btn modal__btn modal__btn--now" onClick={() => setBooking(true)}>
                <FaCalendarCheck aria-hidden /> Book a Table
              </button>
            </div>
          ) : (
            <>
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

          <div className="modal__actions">
            <button type="button" className="btn modal__btn modal__btn--cart" onClick={addToCart}>
              <FaShoppingBag aria-hidden /> Add to Cart
            </button>
            <button type="button" className="btn modal__btn modal__btn--now" onClick={orderThisNow}>
              <FaBolt aria-hidden /> Order Now
            </button>
          </div>

            </>
          )}

          <div className="modal__foot">
            <a href={SITE.phoneHref}>
              <FaPhoneAlt aria-hidden /> Prefer to call? {SITE.phone}
            </a>
            {orderType !== "Dine-in" && (
              <span>{isDelivery(orderType) ? `Delivery charge ৳${DELIVERY_CHARGE}` : "No delivery charge"}</span>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
