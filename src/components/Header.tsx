import { useEffect, useState } from "react";
import { FaAngleDown, FaPhoneAlt, FaShoppingBag, FaTimes } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { SITE } from "../data/content";
import { useActiveSection } from "../hooks/useActiveSection";
import Logo from "./Logo";
import Socials from "./Socials";

const SECTION_IDS = ["home", "about", "services", "outlets", "gallery", "testimonials", "contact"];
const MORE_IDS = ["services", "outlets", "gallery"];

/** Link target for a section of the home page, works from any page. */
const to = (id: string) => ({ pathname: "/", hash: `#${id}` });

export default function Header() {
  const { pathname } = useLocation();
  const { count, openCart } = useCart();
  const onMenu = pathname === "/menu";
  const onFeedback = pathname === "/feedback";
  const onMyOrders = pathname === "/my-orders";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const active = useActiveSection(SECTION_IDS, pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const cls = (id: string) => (!onMenu && !onFeedback && !onMyOrders && active === id ? "active" : "");

  return (
    <header className={`header ${scrolled ? "header--solid" : ""}`}>
      {showBar && (
        <div className="topbar">
          <div className="topbar__inner">
            <div className="topbar__right">
              <a href={SITE.phoneHref} className="topbar__phone">
                <FaPhoneAlt aria-hidden /> Order Now : {SITE.phone}
              </a>
              <span className="topbar__sep" aria-hidden />
              <Socials variant="top" />
              <button
                className="topbar__close"
                onClick={() => setShowBar(false)}
                aria-label="Close top bar"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="nav">
        <Link to={to("home")} className="nav__brand" onClick={close} aria-label="BFC - Best Fried Chicken, home">
          <Logo className="nav__logo" />
        </Link>

        <button
          className={`nav__toggle ${open ? "is-open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className={`nav__menu ${open ? "is-open" : ""}`}>
          <li className={cls("home")}>
            <Link to={to("home")} onClick={close}>Home</Link>
          </li>
          <li className={cls("about")}>
            <Link to={to("about")} onClick={close}>About</Link>
          </li>
          <li className={onMenu ? "active" : ""}>
            <Link to="/menu" onClick={close}>Menu</Link>
          </li>
          <li className={onMyOrders ? "active" : ""}>
            <Link to="/my-orders" onClick={close}>My Orders</Link>
          </li>
          <li className={`has-dropdown ${!onMenu && !onFeedback && MORE_IDS.includes(active) ? "active" : ""}`}>
            <Link to={to("gallery")} onClick={close}>
              Dropdown <FaAngleDown aria-hidden />
            </Link>
            <ul className="dropdown">
              <li><Link to={to("gallery")} onClick={close}>Gallery</Link></li>
              <li><Link to={to("services")} onClick={close}>Services</Link></li>
              <li><Link to={to("outlets")} onClick={close}>Outlets</Link></li>
              <li><Link to="/menu" onClick={close}>Menu</Link></li>
              <li>
                <Link to="/feedback" onClick={close}>Feedback</Link>
              </li>
            </ul>
          </li>
          <li className={onFeedback ? "active" : ""}>
            <Link to="/feedback" onClick={close}>Send Feedback</Link>
          </li>
          <li className={cls("testimonials")}>
            <Link to={to("testimonials")} onClick={close}>Reviews</Link>
          </li>
          <li className={cls("contact")}>
            <Link to={to("contact")} onClick={close}>Contact</Link>
          </li>
          <li className="nav__cta">
            <Link to="/menu" className="btn btn--yellow btn--sm" onClick={close}>
              Order Now
            </Link>
          </li>
        </ul>

        <Link to="/menu" className="btn btn--yellow btn--sm nav__order">
          Order Now
        </Link>

        <button
          className="nav__cart"
          onClick={() => {
            close();
            openCart();
          }}
          aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
        >
          <FaShoppingBag aria-hidden />
          {count > 0 && <span className="nav__badge">{count}</span>}
        </button>
      </nav>
    </header>
  );
}
