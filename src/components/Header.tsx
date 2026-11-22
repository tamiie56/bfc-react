import { useEffect, useState } from "react";
import { FaAngleDown, FaPhoneAlt, FaTimes } from "react-icons/fa";
import { SITE } from "../data/content";
import { useActiveSection } from "../hooks/useActiveSection";
import Logo from "./Logo";
import Socials from "./Socials";

const SECTION_IDS = ["home", "about", "services", "outlets", "gallery", "testimonials", "contact"];
const MORE_IDS = ["services", "outlets", "gallery"];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const active = useActiveSection(SECTION_IDS);

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
  const cls = (id: string) => (active === id ? "active" : "");

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
        <a href="#home" className="nav__brand" onClick={close} aria-label="BFC - Best Fried Chicken, home">
          <Logo className="nav__logo" />
        </a>

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
            <a href="#home" onClick={close}>Home</a>
          </li>
          <li className={cls("about")}>
            <a href="#about" onClick={close}>About</a>
          </li>
          <li>
            <a href={SITE.orderUrl} target="_blank" rel="noreferrer">Menu</a>
          </li>
          <li className={`has-dropdown ${MORE_IDS.includes(active) ? "active" : ""}`}>
            <a href="#gallery" onClick={close}>
              Dropdown <FaAngleDown aria-hidden />
            </a>
            <ul className="dropdown">
              <li><a href="#gallery" onClick={close}>Gallery</a></li>
              <li><a href="#services" onClick={close}>Services</a></li>
              <li><a href="#outlets" onClick={close}>Outlets</a></li>
              <li>
                <a href={SITE.orderUrl} target="_blank" rel="noreferrer">Menu</a>
              </li>
              <li>
                <a href={SITE.feedbackUrl} target="_blank" rel="noreferrer">Feedback</a>
              </li>
            </ul>
          </li>
          <li>
            <a href={SITE.feedbackUrl} target="_blank" rel="noreferrer">Send Feedback</a>
          </li>
          <li className={cls("testimonials")}>
            <a href="#testimonials" onClick={close}>Reviews</a>
          </li>
          <li className={cls("contact")}>
            <a href="#contact" onClick={close}>Contact</a>
          </li>
          <li className="nav__cta">
            <a href={SITE.orderUrl} target="_blank" rel="noreferrer" className="btn btn--yellow btn--sm">
              Order Now
            </a>
          </li>
        </ul>

        <a
          href={SITE.orderUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn--yellow btn--sm nav__order"
        >
          Order Now
        </a>
      </nav>
    </header>
  );
}
