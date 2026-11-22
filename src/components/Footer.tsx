import { FaAlignCenter } from "react-icons/fa";
import { SITE } from "../data/content";
import Socials from "./Socials";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__bg" aria-hidden />
      <div className="container-wide footer__body">
        <div className="footer__grid">
          <div>
            <h2 className="footer__home">
              <a href="#home">
                <FaAlignCenter aria-hidden /> Home
              </a>
            </h2>
            <ul className="footer__links">
              <li><a href="#about">About</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#outlets">Outlets</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#testimonials">Reviews</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="footer__title">Outlet Opening Hours</h3>
            <hr />
            <p className="footer__text">{SITE.hours}</p>
          </div>

          <div>
            <h3 className="footer__title">Contact Us</h3>
            <hr />
            <p className="footer__text">
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
            <p className="footer__text">
              <a href={SITE.phoneHref}>{SITE.phone}</a>
            </p>
            <p className="footer__text">
              House 56/1, Road-1, Block-C, Section-13
              <br />
              Mirpur, Dhaka 1216
            </p>
          </div>
        </div>

        <p className="footer__copy">
          © 2002 BFC. All Rights Reserved | Powered by BFC IT Team
        </p>
        <Socials variant="footer" />
      </div>
    </footer>
  );
}
