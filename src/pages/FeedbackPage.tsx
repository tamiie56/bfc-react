import { useState, type FormEvent } from "react";
import { FaCheckCircle, FaPaperPlane, FaRegStar, FaStar } from "react-icons/fa";
import { Link } from "react-router-dom";
import { isRemote } from "../admin/supabase";
import { newFeedbackId, recordFeedback } from "../admin/store";
import heroImg from "../assets/images/hero.jpg";

/** Google Apps Script web app that writes every feedback into the Google Sheet (see google-apps-script/feedback.gs) */
const SHEET_URL = ((import.meta.env.VITE_FEEDBACK_SHEET_URL as string | undefined) ?? "").trim();

interface Form {
  name: string;
  email: string;
  phone: string;
  message: string;
  rating: number;
  /** honeypot: hidden from people, bots fill it */
  website: string;
}

const EMPTY: Form = { name: "", email: "", phone: "", message: "", rating: 0, website: "" };

function validate(f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email address";
  const digits = f.phone.replace(/[\s\-()+]/g, "");
  if (!/^\d{10,15}$/.test(digits)) e.phone = "Enter a valid phone number";
  if (f.rating < 1) e.rating = "Please choose a star rating";
  if (f.message.trim().length < 5) e.message = "Please write your feedback (at least 5 characters)";
  return e;
}

export default function FeedbackPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const set = (key: Exclude<keyof Form, "rating">) => (ev: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: ev.target.value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (status === "sending") return;

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    // bots fill the hidden field: pretend it worked, save nothing
    if (form.website) {
      setStatus("done");
      return;
    }

    if (!isRemote && !SHEET_URL) {
      console.warn("Neither Supabase nor VITE_FEEDBACK_SHEET_URL is set - feedback has nowhere to go");
      setStatus("error");
      return;
    }

    setStatus("sending");
    const clean = {
      id: newFeedbackId(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      message: form.message.trim(),
      rating: form.rating,
    };

    const jobs: Promise<unknown>[] = [];
    // 1) the team panel (Feedback page) - this is where the team picks what shows on the website
    jobs.push(recordFeedback(clean));
    // 2) the Google Sheet copy, when it is set up. Apps Script has no CORS headers, so this is a
    //    "no-cors" request with a plain-text body; the reply can't be read, a network failure still throws.
    if (SHEET_URL) {
      jobs.push(
        fetch(SHEET_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ ...clean, website: form.website }),
        })
      );
    }

    const results = await Promise.allSettled(jobs);
    if (results.every((r) => r.status === "rejected")) {
      setStatus("error");
      return;
    }
    setForm(EMPTY);
    setStatus("done");
  }

  return (
    <>
      <section className="page-hero">
        <div className="page-hero__bg">
          <img src={heroImg} alt="" />
        </div>
        <div className="container page-hero__inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to={{ pathname: "/", hash: "#home" }}>Home</Link>
            <span>/</span>
            <span>Send Feedback</span>
          </nav>
          <h1 className="page-hero__title">Send Feedback</h1>
          <p className="page-hero__lead">Good or bad, we read every message and use it to serve you better.</p>
        </div>
      </section>

      <section className="feedback section">
        <div className="container">
          <span className="eyebrow">We'd love to hear from you</span>
          <div className="feedback__card">
            {status === "done" ? (
              <div className="feedback__done" role="status">
                <FaCheckCircle aria-hidden />
                <h2>Thank you!</h2>
                <p>Your feedback has reached the BFC team.</p>
                <button type="button" className="btn btn--yellow" onClick={() => setStatus("idle")}>
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="feedback__row">
                  <label className="field">
                    <span>Name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set("name")}
                      autoComplete="name"
                      placeholder="Your full name"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <small className="field__err">{errors.name}</small>}
                  </label>

                  <label className="field">
                    <span>Phone number</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX"
                      aria-invalid={!!errors.phone}
                    />
                    {errors.phone && <small className="field__err">{errors.phone}</small>}
                  </label>
                </div>

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <small className="field__err">{errors.email}</small>}
                </label>

                <div className="field">
                  <span id="rate-label">Your rating</span>
                  <div className="rate" data-level={form.rating === 1 ? "low" : form.rating > 1 ? "good" : "none"} role="radiogroup" aria-labelledby="rate-label">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={form.rating === n}
                        aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                        className={n <= form.rating ? "is-on" : ""}
                        onClick={() => {
                          setForm((f) => ({ ...f, rating: n }));
                          if (errors.rating) setErrors((e) => ({ ...e, rating: "" }));
                        }}
                      >
                        {n <= form.rating ? <FaStar aria-hidden /> : <FaRegStar aria-hidden />}
                      </button>
                    ))}
                  </div>
                  {errors.rating && <small className="field__err">{errors.rating}</small>}
                </div>

                <label className="field">
                  <span>Your feedback</span>
                  <textarea
                    rows={6}
                    value={form.message}
                    onChange={set("message")}
                    maxLength={2000}
                    placeholder="Tell us about your experience..."
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && <small className="field__err">{errors.message}</small>}
                </label>

                {/* honeypot */}
                <div className="feedback__trap" aria-hidden="true">
                  <label>
                    Website
                    <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
                  </label>
                </div>

                {status === "error" && (
                  <p className="feedback__error" role="alert">
                    Sorry, we could not send your feedback. Please try again in a moment.
                  </p>
                )}

                <button type="submit" className="btn btn--red feedback__submit" disabled={status === "sending"}>
                  {status === "sending" ? "Sending..." : "Send Feedback"} <FaPaperPlane aria-hidden />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
