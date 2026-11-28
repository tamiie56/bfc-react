import { useMemo, useRef, useState } from "react";
import { FaCommentDots, FaEnvelope, FaPhoneAlt, FaRegStar, FaSearch, FaStar, FaTrashAlt, FaUpload } from "react-icons/fa";
import { ago, fmtDateTime } from "../format";
import { feedbackFromCsv } from "../importFeedback";
import { deleteFeedback, importFeedbacks, setFeedbackFeatured, useFeedbacks } from "../store";
import type { AdminFeedback } from "../store";
import { Empty, PageHead, Pill, Switch, useConfirm, useToast } from "../ui";

type Tab = "all" | "shown" | "hidden";

/** the website slider shows at most this many (newest chosen first) */
const SLIDER_MAX = 12;

/** 1 star is red, 2-5 stars are green; old imported feedback has no rating */
function Stars({ value }: { value: number }) {
  if (value < 1) return <span className="adm-muted">No rating</span>;
  return (
    <span className={`adm-stars ${value === 1 ? "is-low" : "is-good"}`} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (i < value ? <FaStar key={i} aria-hidden /> : <FaRegStar key={i} aria-hidden />))}
    </span>
  );
}

export default function Feedback() {
  const items = useFeedbacks();
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = items.filter((f) => f.featured).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((f) => {
      if (tab === "shown" && !f.featured) return false;
      if (tab === "hidden" && f.featured) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q) || f.message.toLowerCase().includes(q) || f.phone.includes(q) || f.email.toLowerCase().includes(q);
    });
  }, [items, tab, query]);

  const toggle = (f: AdminFeedback, on: boolean) => {
    setFeedbackFeatured(f.id, on);
    toast(on ? `${f.name}'s feedback is now on the website` : `${f.name}'s feedback removed from the website`, on ? "ok" : "warn");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const rows = feedbackFromCsv(await file.text());
      if (rows.length === 0) {
        toast("No feedback found in that file. Use the CSV downloaded from the Google Sheet.", "warn");
        return;
      }
      const { added, skipped } = importFeedbacks(rows);
      toast(
        added === 0
          ? "All of these are already imported"
          : `Imported ${added} feedback${added === 1 ? "" : "s"}${skipped ? ` (${skipped} already there)` : ""}`
      );
    } catch {
      toast("Could not read that file", "warn");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (f: AdminFeedback) =>
    ask({
      title: "Delete this feedback?",
      text: `${f.name}'s feedback will be removed for good, and from the website too.`,
      confirmLabel: "Delete",
      danger: true,
      onYes: () => {
        deleteFeedback(f.id);
        toast("Feedback deleted", "warn");
      },
    });

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "all", label: "All", n: items.length },
    { id: "shown", label: "On website", n: shown },
    { id: "hidden", label: "Not shown", n: items.length - shown },
  ];

  return (
    <>
      <PageHead
        title="Feedback"
        sub={`${items.length} ${items.length === 1 ? "message" : "messages"} - ${shown} shown in the website Reviews slider`}
        actions={
          <>
            <button className="adm-btn adm-btn--ghost" onClick={() => fileRef.current?.click()}>
              <FaUpload aria-hidden /> Import from Google Sheet
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </>
        }
      />

      <p className="adm-note-box">
        Switch on <b>Show on website</b> for the feedback you want in the Reviews slider on the home page. The slider shows up to {SLIDER_MAX}, newest
        choice first. The customer's phone and email are never shown on the website.
        <br />
        Feedback added to your Google Sheet appears here by itself within a minute (set up once with <code>google-apps-script/feedback.gs</code>).
        As a one-time alternative you can download the sheet as CSV and use <b>Import from Google Sheet</b>.
      </p>

      <div className="adm-toolbar">
        <label className="adm-search">
          <FaSearch aria-hidden />
          <input placeholder="Search name, message, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search feedback" />
        </label>
      </div>

      <div className="adm-chipbar" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`adm-chip ${tab === t.id ? "is-active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label} <b>{t.n}</b>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="adm-card">
          <Empty
            icon={FaCommentDots}
            title={items.length === 0 ? "No feedback yet" : "Nothing here"}
            text={items.length === 0 ? "Feedback sent from the website Send Feedback page shows up here." : "Try another filter or search."}
          />
        </div>
      ) : (
        <ul className="adm-fb-list">
          {rows.map((f) => (
            <li key={f.id} className={`adm-card adm-fb ${f.featured ? "is-on" : ""}`}>
              <div className="adm-fb__top">
                <div>
                  <b className="adm-fb__name">{f.name}</b>
                  <small title={fmtDateTime(f.placedAt)}>{ago(f.placedAt)}</small>
                </div>
                <div className="adm-fb__rate">
                  <Stars value={f.rating} />
                  {f.featured && <Pill tone="completed">On website</Pill>}
                </div>
              </div>

              <p className="adm-fb__msg">{f.message}</p>

              <div className="adm-fb__foot">
                <span className="adm-fb__contact">
                  <a href={`tel:${f.phone}`}>
                    <FaPhoneAlt aria-hidden /> {f.phone}
                  </a>
                  <a href={`mailto:${f.email}`}>
                    <FaEnvelope aria-hidden /> {f.email}
                  </a>
                </span>
                <span className="adm-fb__actions">
                  <label className="adm-fb__switch">
                    <Switch checked={f.featured} onChange={(v) => toggle(f, v)} label={`Show ${f.name}'s feedback on the website`} />
                    Show on website
                  </label>
                  <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => remove(f)} aria-label="Delete feedback" title="Delete">
                    <FaTrashAlt aria-hidden />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog}
    </>
  );
}
