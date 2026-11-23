import { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { FOODS, SITE } from "../data/content";
import type { FoodItem } from "../data/content";
import { cssVars } from "../utils/style";
import CountUp from "./CountUp";

function Slide({ food, mode }: { food: FoodItem; mode: "in" | "out" }) {
  return (
    <div className={`stage__slide is-${mode}`} aria-hidden={mode === "out"}>
      <div className="stage__figure">
        <img src={food.image} alt={mode === "in" ? food.title : ""} className="stage__img" />
      </div>
      <div className="stage__info">
        <h3>{food.title}</h3>
        <p>Price Starts from</p>
        <div className="stage__price">
          BDT ৳{mode === "in" ? <CountUp end={food.price} duration={900} /> : food.price}
        </div>
        <a href={SITE.orderUrl} target="_blank" rel="noreferrer" className="btn btn--yellow">
          Order Now <FaArrowRight aria-hidden />
        </a>
      </div>
    </div>
  );
}

export default function Services() {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const food = FOODS[active];

  const go = (i: number) => {
    if (i === active) return;
    setPrev(active);
    setActive(i);
  };
  const next = () => go((active + 1) % FOODS.length);

  // drop the outgoing slide once its roll-out animation is done
  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), 800);
    return () => clearTimeout(t);
  }, [prev]);

  return (
    <section className="services section" id="services">
      <div className="container">
        <span className="eyebrow eyebrow--light reveal">Menu highlights</span>
        <h2 className="section-title section-title--light reveal">
          What kind of Foods we serve for you
        </h2>

        <div
          className="showcase reveal"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <ul className="showcase__tabs">
            {FOODS.map((f, i) => (
              <li key={f.title}>
                <button
                  className={`tab ${i === active ? "is-active" : ""}`}
                  aria-pressed={i === active}
                  onClick={() => go(i)}
                >
                  <img src={f.image} alt="" loading="lazy" />
                  <span className="tab__text">
                    <strong>{f.title}</strong>
                    <small>Price Starts from BDT ৳{f.price}</small>
                  </span>
                  {i === active && (
                    <span
                      className="tab__bar"
                      onAnimationEnd={next}
                      style={{ animationPlayState: paused ? "paused" : "running" }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="showcase__stage" style={cssVars({ "--glow": food.glow })}>
            {prev !== null && <Slide key={`out-${prev}`} food={FOODS[prev]} mode="out" />}
            <Slide key={`in-${active}`} food={food} mode="in" />
          </div>
        </div>

        <div className="services__more reveal">
          <Link to="/menu" className="btn btn--ghost">
            View Full Menu <FaArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
