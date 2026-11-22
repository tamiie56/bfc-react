import { ABOUT, AREAS, FOODS, FOUNDED, OUTLET_COUNT } from "../data/content";
import { delay } from "../utils/style";
import CountUp from "./CountUp";

export default function About() {
  const years = new Date().getFullYear() - FOUNDED;
  const stats = [
    { end: OUTLET_COUNT, label: "Outlets in Dhaka" },
    { end: years, label: `Years since ${FOUNDED}` },
    { end: AREAS.length, label: "Key areas covered" },
    { end: FOODS.length, label: "Food categories" },
  ];

  return (
    <section className="about section" id="about">
      <div className="container about__grid">
        <div className="about__media reveal reveal--left">
          <div className="about__oval" aria-hidden />
          <img
            className="about__img"
            src={ABOUT.image}
            alt="BFC burger, fried chicken and drink combo"
            loading="lazy"
          />
          <span className="about__tag">Since {FOUNDED}</span>
        </div>

        <div className="about__text">
          <span className="eyebrow reveal">Our story</span>
          <h2 className="section-title section-title--left reveal" style={delay(80)}>
            About
          </h2>
          {ABOUT.paragraphs.map((p, i) => (
            <p key={i} className={`reveal ${i === 0 ? "lead" : ""}`} style={delay(120 + i * 90)}>
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="stats reveal">
        <div className="container scoreboard">
          {stats.map((s) => (
            <div className="score" key={s.label}>
              <strong>
                <CountUp end={s.end} />
              </strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
