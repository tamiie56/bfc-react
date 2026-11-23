import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaMapMarkerAlt, FaPhoneAlt, FaSearch } from "react-icons/fa";
import { AREAS, OUTLET_COUNT, SITE } from "../data/content";

export default function Outlets() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = AREAS.filter((a) => a.toLowerCase().includes(query.trim().toLowerCase()));
  const current = selected && filtered.includes(selected) ? selected : filtered[0] ?? null;

  return (
    <section className="outlets section" id="outlets">
      <div className="container">
        <span className="eyebrow reveal">Find us</span>
        <h2 className="section-title reveal">
          {OUTLET_COUNT} outlets across Dhaka
        </h2>

        <div className="outlets__grid">
          <div className="reveal reveal--left">
            <label className="search">
              <FaSearch aria-hidden />
              <input
                type="search"
                placeholder="Search your area (e.g. Gulshan)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search outlet area"
              />
            </label>

            <ul className="chips">
              {filtered.map((a) => (
                <li key={a}>
                  <button
                    className={`chip ${a === current ? "is-active" : ""}`}
                    onClick={() => setSelected(a)}
                  >
                    <FaMapMarkerAlt aria-hidden /> {a}
                  </button>
                </li>
              ))}
            </ul>

            {filtered.length === 0 && (
              <p className="outlets__empty">
                No area found for &ldquo;{query}&rdquo;. Call {SITE.phone} and we&apos;ll help you
                find the nearest outlet.
              </p>
            )}
          </div>

          <div className="outlet-card reveal reveal--right">
            {current ? (
              <div className="outlet-card__inner" key={current}>
                <span className="outlet-card__tag">BFC outlet</span>
                <h3>{current}</h3>
                <p>Best Fried Chicken is serving fresh, hygienic and tasty food in {current}, Dhaka.</p>
                <p className="outlet-card__hours">Outlet Opening Hours: {SITE.hours}</p>
                <div className="outlet-card__cta">
                  <Link to="/menu" className="btn btn--yellow">
                    Order Now <FaArrowRight aria-hidden />
                  </Link>
                  <a href={SITE.phoneHref} className="btn btn--ghost">
                    <FaPhoneAlt aria-hidden /> {SITE.phone}
                  </a>
                </div>
              </div>
            ) : (
              <div className="outlet-card__inner">
                <h3>{OUTLET_COUNT} outlets</h3>
                <p>In most of the key areas of Dhaka city.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
