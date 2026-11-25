import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";
import type { IconType } from "react-icons";
import type { BookingStatus, OrderStatus } from "./store";

/* ---------- status pill ---------- */

export function Pill({ tone, children }: { tone: OrderStatus | BookingStatus | "muted" | "yellow"; children: ReactNode }) {
  return <span className={`adm-pill adm-pill--${tone}`}>{children}</span>;
}

/* ---------- drawer / modal ---------- */

function useEscLock(onClose: () => void) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
}

interface PanelProps {
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ title, sub, onClose, children, footer }: PanelProps) {
  useEscLock(onClose);
  return (
    <div className="adm-overlay" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="adm-drawer__head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="adm-drawer__sub">{sub}</div>}
          </div>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>
        <div className="adm-drawer__body">{children}</div>
        {footer && <footer className="adm-drawer__foot">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: PanelProps & { wide?: boolean }) {
  useEscLock(onClose);
  return (
    <div className="adm-overlay adm-overlay--center" onClick={onClose}>
      <div className={`adm-modal ${wide ? "adm-modal--wide" : ""}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="adm-modal__head">
          <h2>{title}</h2>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>
        <div className="adm-modal__body">{children}</div>
        {footer && <footer className="adm-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------- confirm dialog ---------- */

interface ConfirmOpts {
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
  onYes: () => void;
}

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const ask = useCallback((o: ConfirmOpts) => setOpts(o), []);
  const dialog = opts ? (
    <Modal
      title={opts.title}
      onClose={() => setOpts(null)}
      footer={
        <>
          <button className="adm-btn adm-btn--ghost" onClick={() => setOpts(null)}>
            Cancel
          </button>
          <button
            className={`adm-btn ${opts.danger ? "adm-btn--danger" : "adm-btn--red"}`}
            onClick={() => {
              opts.onYes();
              setOpts(null);
            }}
          >
            {opts.confirmLabel ?? "Confirm"}
          </button>
        </>
      }
    >
      <p className="adm-muted">{opts.text}</p>
    </Modal>
  ) : null;
  return { ask, dialog };
}

/* ---------- toasts ---------- */

interface Toast {
  id: number;
  text: string;
  kind: "ok" | "warn";
}

const ToastCtx = createContext<(text: string, kind?: Toast["kind"]) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-3), { id, text, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`adm-toast adm-toast--${t.kind}`}>
            {t.kind === "ok" ? <FaCheckCircle aria-hidden /> : <FaExclamationCircle aria-hidden />} {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- small pieces ---------- */

export function Empty({ icon: Icon, title, text, children }: { icon: IconType; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="adm-empty">
      <span className="adm-empty__icon">
        <Icon aria-hidden />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="adm-page__head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="adm-muted">{sub}</p>}
      </div>
      {actions && <div className="adm-page__actions">{actions}</div>}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`adm-switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
