import { FaArrowRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import heroImg from "../assets/images/hero.jpg";
import { useParallax } from "../hooks/useParallax";
import { delay } from "../utils/style";
import OpenStatus from "./OpenStatus";

export default function Hero() {
  const mediaRef = useParallax<HTMLDivElement>(0.3);

  return (
    <section className="hero" id="home">
      <div className="hero__media" ref={mediaRef}>
        <img src={heroImg} alt="" />
      </div>

      <div className="container hero__inner">
        <span className="hero__chip rise" style={delay(150)}>
          Since 2002 · Bangladesh&apos;s largest local fast-food chain
        </span>

        <h1 className="hero__title">
          <span className="hero__bfc rise" style={delay(300)}>BFC</span>
          <span className="hero__full rise" style={delay(480)}>(Best Fried Chicken)</span>
        </h1>

        <p className="hero__lead rise" style={delay(650)}>
          Fresh, hygienic, tasty food at an affordable price.
        </p>

        <div className="hero__cta rise" style={delay(800)}>
          <Link to="/menu" className="btn btn--red">
            Order Now <FaArrowRight aria-hidden />
          </Link>
          <a href="#services" className="btn btn--ghost">
            Explore Foods
          </a>
        </div>

        <div className="rise" style={delay(950)}>
          <OpenStatus />
        </div>
      </div>

    </section>
  );
}
