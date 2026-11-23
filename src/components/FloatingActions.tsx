import { useEffect, useState } from "react";
import { FaPhoneAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { SITE } from "../data/content";

/** Sticky Call / Order bar - mobile only (hidden by CSS on larger screens). */
export default function FloatingActions() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`mbar ${show ? "is-visible" : ""}`}>
      <a href={SITE.phoneHref} className="mbar__call">
        <FaPhoneAlt aria-hidden /> Call
      </a>
      <Link to="/menu" className="mbar__order">
        Order Now
      </Link>
    </div>
  );
}
