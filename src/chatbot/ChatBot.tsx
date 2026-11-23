import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getReply } from "./engine";
import type { BotLink, BotReply, ChatTurn } from "./engine";
import Mascot from "./Mascot";

interface Msg extends BotReply {
  id: number;
  from: "bot" | "user";
}

const WELCOME: BotReply = {
  text: "Hi! I'm Chicky, BFC's chicken buddy. Ask me about our menu and prices, outlets, opening hours or how to order.",
  chips: ["Menu", "Opening hours", "Outlets", "How to order", "Delivery charge"],
};

let uid = 0;
const make = (from: Msg["from"], r: BotReply): Msg => ({ id: ++uid, from, ...r });

function LinkBtn({ link, onNavigate }: { link: BotLink; onNavigate: () => void }) {
  if (link.to) {
    return (
      <Link className="bot__link" to={{ pathname: link.to, hash: link.hash }} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  }
  const external = !!link.href && /^https?:/.test(link.href);
  return (
    <a className="bot__link" href={link.href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {link.label}
    </a>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(() => [make("bot", WELCOME)]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // small "ask me" bubble a few seconds after load (once per visit)
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("bfc-chat-nudge") === "1";
    } catch {
      /* storage unavailable */
    }
    if (seen) return;
    const show = setTimeout(() => setNudge(true), 3500);
    const hide = setTimeout(() => setNudge(false), 11000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    setNudge(false);
    try {
      sessionStorage.setItem("bfc-chat-nudge", "1");
    } catch {
      /* ignore */
    }
  };

  const send = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;
    const history: ChatTurn[] = msgs.map((m) => ({ role: m.from, text: m.text }));
    setMsgs((m) => [...m, make("user", { text: value })]);
    setText("");
    setBusy(true);
    const [reply] = await Promise.all([getReply(value, history), new Promise((r) => setTimeout(r, 550))]);
    setMsgs((m) => [...m, make("bot", reply)]);
    setBusy(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  const last = msgs[msgs.length - 1];

  return (
    <div className={`bot ${open ? "is-open" : ""}`}>
      {open && (
        <section className="bot__panel" role="dialog" aria-label="Chat with Chicky">
          <header className="bot__head">
            <span className="bot__avatar">
              <Mascot talking={busy} />
            </span>
            <div className="bot__who">
              <strong>Chicky</strong>
              <span>
                <i aria-hidden /> BFC assistant
              </span>
            </div>
            <button className="bot__close" onClick={toggle} aria-label="Close chat">
              <FaTimes />
            </button>
          </header>

          <div className="bot__log" ref={listRef} role="log" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`bot__msg bot__msg--${m.from}`}>
                <p>{m.text}</p>
                {m.links && (
                  <div className="bot__links">
                    {m.links.map((l) => (
                      <LinkBtn key={l.label} link={l} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="bot__msg bot__msg--bot bot__typing" aria-label="Chicky is typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {!busy && last?.from === "bot" && last.chips && (
            <div className="bot__chips">
              {last.chips.map((c) => (
                <button key={c} onClick={() => void send(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <form className="bot__form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about menu, price, outlets…"
              aria-label="Your message"
              maxLength={200}
            />
            <button type="submit" aria-label="Send" disabled={!text.trim() || busy}>
              <FaPaperPlane />
            </button>
          </form>
        </section>
      )}

      {!open && nudge && (
        <button className="bot__nudge" onClick={toggle}>
          Hungry? Ask Chicky!
        </button>
      )}

      <button className="bot__fab" onClick={toggle} aria-label={open ? "Close chat" : "Chat with Chicky"} aria-expanded={open}>
        {open ? <FaTimes /> : <Mascot />}
      </button>
    </div>
  );
}
