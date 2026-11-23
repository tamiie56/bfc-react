import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent as RPointerEvent } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getReply } from "./engine";
import type { BotLink, BotReply, ChatTurn } from "./engine";
import Mascot, { MascotHead } from "./Mascot";

interface Msg extends BotReply {
  id: number;
  from: "bot" | "user";
}

const WELCOME: BotReply = {
  text: "Hi! I'm Chicky, BFC's chicken buddy. Ask me about our menu and prices, outlets, opening hours or how to order.",
  chips: ["Menu", "Opening hours", "Outlets", "How to order", "Delivery charge"],
};

const POS_KEY = "bfc-chicky-pos";
const BOX = { w: 100, h: 120 }; // mascot size on screen (px)

interface Pos {
  x: number;
  y: number;
}

const clampPos = (p: Pos): Pos => ({
  x: Math.min(Math.max(4, p.x), Math.max(4, window.innerWidth - BOX.w - 4)),
  y: Math.min(Math.max(4, p.y), Math.max(4, window.innerHeight - BOX.h - 4)),
});

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
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [pos, setPos] = useState<Pos | null>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) return clampPos(JSON.parse(raw) as Pos);
    } catch {
      /* ignore */
    }
    return null;
  });
  const [place, setPlace] = useState({ up: true, right: true, h: 560 });

  // keep the mascot on screen when the window is resized
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampPos(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // open the panel on whichever side of the mascot has more room
  const measure = useCallback(() => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    const above = r.top - 16;
    const below = window.innerHeight - r.bottom - 16;
    const up = above >= Math.min(560, below) || above >= below;
    setPlace({
      up,
      right: r.left + r.width / 2 > window.innerWidth / 2,
      h: Math.max(280, Math.min(560, up ? above : below)),
    });
  }, []);
  useLayoutEffect(() => {
    if (open) measure();
  }, [open, pos, measure]);

  const onDown = (e: RPointerEvent<HTMLButtonElement>) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
    setNudge(false);
    setPos(clampPos({ x: e.clientX - d.dx, y: e.clientY - d.dy }));
  };
  const onUp = () => {
    setTimeout(() => {
      drag.current = null;
    }, 60);
    if (drag.current?.moved) {
      try {
        if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        /* ignore */
      }
    }
  };

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
    if (drag.current?.moved) {
      drag.current = null; // this click was the end of a drag
      return;
    }
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
    <div
      ref={rootRef}
      className={`bot ${open ? "is-open" : ""} ${place.up ? "is-up" : "is-down"} ${place.right ? "is-right" : "is-left"}`}
      style={pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : undefined}
    >
      {open && (
        <section
          className="bot__panel"
          role="dialog"
          aria-label="Chat with Chicky"
          style={{ ["--ph" as string]: `${place.h}px` }}
        >
          <header className="bot__head">
            <span className="bot__avatar">
              <MascotHead talking={busy} />
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
          Hi! Ask me anything
        </button>
      )}

      <button
        className="bot__mascot"
        onClick={toggle}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label={open ? "Close chat" : "Chat with Chicky (drag to move)"}
        aria-expanded={open}
        title="Drag me anywhere!"
      >
        <Mascot talking={busy} />
      </button>
    </div>
  );
}
