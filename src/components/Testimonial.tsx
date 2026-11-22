import { FaQuoteLeft, FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";
import reviewImg from "../assets/images/review.jpg";
import { REVIEW, SITE } from "../data/content";
import { useParallax } from "../hooks/useParallax";
import { delay } from "../utils/style";

export default function Testimonial() {
  const bgRef = useParallax<HTMLDivElement>(0.14);
  const full = Math.floor(REVIEW.rating);
  const half = REVIEW.rating - full >= 0.5;

  return (
    <section className="testimonials" id="testimonials">
      <div className="testimonials__bg" ref={bgRef}>
        <img src={reviewImg} alt="" loading="lazy" />
      </div>

      <div className="container testimonials__inner">
        <div className="review reveal reveal--zoom">
          <FaQuoteLeft className="review__mark" aria-hidden />
          <ul className="stars" aria-label={`${REVIEW.rating} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} style={delay(300 + i * 120)}>
                {i < full ? <FaStar /> : i === full && half ? <FaStarHalfAlt /> : <FaRegStar />}
              </li>
            ))}
          </ul>
          <p className="review__text">{REVIEW.text}</p>
          <h3 className="review__name">{REVIEW.name}</h3>
          <a href={SITE.feedbackUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            Send Feedback
          </a>
        </div>
      </div>
    </section>
  );
}
