import { useState } from "react";
import {
  FaCheck,
  FaClock,
  FaEnvelopeOpen,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaRegCopy,
} from "react-icons/fa";
import { SITE } from "../data/content";
import OpenStatus from "./OpenStatus";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <button className={`copy ${done ? "is-done" : ""}`} onClick={copy} aria-label={`Copy ${label}`}>
      {done ? <FaCheck /> : <FaRegCopy />}
      <span>{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function Contact() {
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.mapQuery)}`;

  return (
    <section className="contact section" id="contact">
      <div className="container">
        <span className="eyebrow reveal">Get in touch</span>
        <h2 className="section-title reveal">Contact Us</h2>

        <div className="contact__wrap reveal reveal--zoom">
          <ul className="contact__list">
            <li className="c-row">
              <span className="c-row__icon"><FaMapMarkerAlt /></span>
              <div>
                <h4>{SITE.addressTitle}</h4>
                {SITE.addressLines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                <a className="c-row__link" href={mapLink} target="_blank" rel="noreferrer">
                  Open in Maps
                </a>
              </div>
            </li>

            <li className="c-row">
              <span className="c-row__icon"><FaEnvelopeOpen /></span>
              <div>
                <h4>Email</h4>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                <CopyButton value={SITE.email} label="email" />
              </div>
            </li>

            <li className="c-row">
              <span className="c-row__icon"><FaMobileAlt /></span>
              <div>
                <h4>Phone Number</h4>
                <a href={SITE.phoneHref}>{SITE.phone}</a>
                <CopyButton value={SITE.phone} label="phone number" />
              </div>
            </li>

            <li className="c-row">
              <span className="c-row__icon"><FaClock /></span>
              <div>
                <h4>Outlet Opening Hours</h4>
                <p>{SITE.hours}</p>
                <OpenStatus />
              </div>
            </li>
          </ul>

          <div className="map">
            <iframe
              title="BFC location map"
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
