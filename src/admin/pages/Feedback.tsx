import { useMemo, useState } from "react";
import { FaCommentDots, FaEnvelope, FaPhoneAlt, FaRegStar, FaSearch, FaStar, FaTrashAlt } from "react-icons/fa";
import { ago, fmtDateTime } from "../format";
import { deleteFeedback, setFeedbackFeatured, useFeedbacks } from "../store";
import type { AdminFeedback } from "../store";
import { Empty, PageHead, Pill, Switch, useConfirm, useToast } from "../ui";

type Tab = "all" | "shown" | "hidden";

/** the website slider shows at most this many (newest chosen first) */
const SLIDER_MAX = 12;

function Stars({ value }: { value: number }) {
  return (
    <span className="adm-stars" aria-label={`${value} out of 5`}>
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
      />

      <p className="adm-note-box">
        Switch on <b>Show on website</b> for the feedback you want in the Reviews slider on the home page. The slider shows up to {SLIDER_MAX}, newest
        choice first. The customer's phone and email are never shown on the website.
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
