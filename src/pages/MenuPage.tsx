import { useMemo, useState } from "react";
import { FaArrowRight, FaPhoneAlt, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import ChipScroller from "../components/ChipScroller";
import DishModal from "../components/DishModal";
import heroImg from "../assets/images/hero.jpg";
import { SERVICES, SITE } from "../data/content";
import { useLiveMenu, useSettings } from "../admin/store";
import type { LiveCategory, LiveDish } from "../admin/store";
import { PLACEHOLDER, dishImage } from "../data/menu";
import "./menu-live.css";
import { delay } from "../utils/style";

function Dish({ dish, onOpen }: { dish: LiveDish; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  const photo = dishImage(dish);
  const hasPhoto = Boolean(photo) && !broken;

  return (
    <li className={`dish ${dish.soldOut ? "is-soldout" : ""}`}>
      <button
        className="dish__link"
        onClick={onOpen}
        disabled={dish.soldOut}
        aria-label={dish.soldOut ? `${dish.name} - sold out` : `View ${dish.name}`}
      >
        <span className="dish__thumb">
          <img
            src={hasPhoto ? photo : PLACEHOLDER}
            alt=""
            className={hasPhoto ? "" : "is-ph"}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        </span>
        <div className="dish__body">
          <div className="dish__line">
            <h3>{dish.name}</h3>
            <i className="dish__dots" aria-hidden />
            {dish.soldOut ? (
              <strong className="dish__sold">Sold out</strong>
            ) : (
              <strong>
                {dish.from && <small>From</small>}৳{dish.price}
              </strong>
            )}
          </div>
          {dish.desc && <p>{dish.desc}</p>}
        </div>
      </button>
    </li>
  );
}

export default function MenuPage() {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ dish: LiveDish; cat: LiveCategory } | null>(null);
  const menu = useLiveMenu();
  const { deliveryCharge } = useSettings();

  const total = useMemo(() => menu.reduce((n, c) => n + c.items.length, 0), [menu]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((c) => cat === "all" || c.id === cat)
      .map((c) => ({
        ...c,
        items: q
          ? c.items.filter(
              (d) => d.name.toLowerCase().includes(q) || (d.desc ?? "").toLowerCase().includes(q)
            )
          : c.items,
      }))
      .filter((c) => c.items.length > 0);
  }, [menu, cat, query]);

  const shown = sections.reduce((n, c) => n + c.items.length, 0);

  return (
    <>
      <section className="page-hero">
        <div className="page-hero__bg">
          <img src={heroImg} alt="" />
        </div>
        <div className="container page-hero__inner">
          <nav className="crumbs rise" style={delay(100)} aria-label="Breadcrumb">
            <Link to={{ pathname: "/", hash: "#home" }}>Home</Link>
            <span>/</span>
            <span>Menu</span>
          </nav>
          <h1 className="page-hero__title rise" style={delay(250)}>
            Our Menu
          </h1>
          <p className="page-hero__lead rise" style={delay(400)}>
            Fresh, hygienic, tasty food at an affordable price.
          </p>
        </div>
      </section>

      <section className="menu section">
        <div className="container">
          <label className="search menu__search reveal" id="menu-top">
            <FaSearch aria-hidden />
            <input
              type="search"
              placeholder={`Search ${total} items (e.g. burger, wings, combo)`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search menu"
            />
          </label>

          <div className="menu__cats">
            <ChipScroller activeKey={cat}>
              <ul className="chips">
                <li>
                  <button className={`chip ${cat === "all" ? "is-active" : ""}`} onClick={() => setCat("all")}>
                    All
                  </button>
                </li>
                {menu.map((c) => (
                  <li key={c.id}>
                    <button
                      className={`chip ${cat === c.id ? "is-active" : ""}`}
                      onClick={() => setCat(c.id)}
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </ChipScroller>
          </div>

          <p className="menu__count">
            Showing <strong>{shown}</strong> of {total} items
          </p>

          <div className="menu-list" key={`${cat}-${query}`}>
            {sections.map((c) => (
              <article className="board reveal" key={c.id} id={`menu-${c.id}`}>
                <header className="board__head">
                  <h2>{c.title}</h2>
                  <span>{c.items.length} {c.items.length === 1 ? "item" : "items"}</span>
                </header>
                <ul className="board__items">
                  {c.items.map((d) => (
                    <Dish key={d.name} dish={d} onOpen={() => setSelected({ dish: d, cat: c })} />
                  ))}
                </ul>
              </article>
            ))}

            {sections.length === 0 && (
              <p className="menu__empty">
                No item found for &ldquo;{query}&rdquo;. Try another word or call {SITE.phone}.
              </p>
            )}
          </div>

          <p className="menu__note">
            Menu and prices are from the BFC online ordering page (Uttara Jashimuddin outlet) and may
            vary by outlet. Delivery charge: ৳{deliveryCharge}. Items without a photo show the BFC logo.
          </p>

          <div className="menu-order reveal">
            <div>
              <h3>Order your favourite BFC</h3>
              <p>Pick your items, add them to the cart and place your order - delivery, take away or dine-in.</p>
              <ul className="menu-order__tags">
                {SERVICES.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="menu-order__cta">
              <button
                className="btn btn--red"
                onClick={() => document.getElementById("menu-top")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                Start Your Order <FaArrowRight aria-hidden />
              </button>
              <a href={SITE.phoneHref} className="btn btn--ghost">
                <FaPhoneAlt aria-hidden /> {SITE.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <DishModal
          dish={selected.dish}
          categoryId={selected.cat.id}
          categoryTitle={selected.cat.title}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
