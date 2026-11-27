import { FaAlignCenter } from "react-icons/fa";
import { Link } from "react-router-dom";
import { SITE } from "../data/content";
import Socials from "./Socials";

const to = (id: string) => ({ pathname: "/", hash: `#${id}` });

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__bg" aria-hidden />
      <div className="container-wide footer__body">
        <div className="footer__grid">
          <div>
            <h2 className="footer__home">
              <Link to={to("home")}>
                <FaAlignCenter aria-hidden /> Home
              </Link>
            </h2>
            <ul className="footer__links">
              <li><Link to={to("about")}>About</Link></li>
              <li><Link to="/menu">Menu</Link></li>
              <li><Link to={to("services")}>Services</Link></li>
              <li><Link to={to("outlets")}>Outlets</Link></li>
              <li><Link to={to("gallery")}>Gallery</Link></li>
              <li><Link to={to("testimonials")}>Reviews</Link></li>
              <li><Link to={to("contact")}>Contact</Link></li>
              <li><Link to="/cancel-order">Cancel Order</Link></li>
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

        <div className="footer__bottom">
          <p className="footer__copy">© 2002 BFC. All Rights Reserved</p>
          <Socials variant="footer" />
          <p className="footer__credit">
            System Design &amp; Developed By :{" "}
            <a href="https://regantoitsolution.com/" target="_blank" rel="noreferrer">
              Reganto IT Solution
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
