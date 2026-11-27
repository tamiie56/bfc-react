import { FaArrowRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import heroImg from "../assets/images/hero.jpg";
import OpenStatus from "./OpenStatus";

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero__media">
        <img src={heroImg} alt="" />
      </div>

      <div className="container hero__inner">
        <span className="hero__chip">
          Since 2002 · Bangladesh&apos;s largest local fast-food chain
        </span>

        <h1 className="hero__title">
          <span className="hero__bfc">BFC</span>
          <span className="hero__full">(Best Fried Chicken)</span>
        </h1>

        <p className="hero__lead">
          Fresh, hygienic, tasty food at an affordable price.
        </p>

        <div className="hero__cta">
          <Link to="/menu" className="btn btn--red">
            Order Now <FaArrowRight aria-hidden />
          </Link>
          <a href="#services" className="btn btn--ghost">
            Explore Foods
          </a>
        </div>

        <div>
          <OpenStatus />
        </div>
      </div>

    </section>
  );
}
