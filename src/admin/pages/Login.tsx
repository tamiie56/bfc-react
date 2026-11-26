import { useState } from "react";
import type { FormEvent } from "react";
import { FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import logo from "../../assets/images/logo.png";
import { LOGIN_USES_EMAIL, login } from "../auth";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await login(user, pass);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="adm adm-login">
      <div className="adm-login__art" aria-hidden>
        <span>BFC</span>
        <p>Best Fried Chicken</p>
      </div>

      <form className="adm-login__card" onSubmit={submit}>
        <img src={logo} alt="BFC" className="adm-login__logo" />
        <h1>Team Panel</h1>
        <p className="adm-muted">Sign in to manage orders, bookings and the menu.</p>

        <label className="adm-field">
          <span>{LOGIN_USES_EMAIL ? "Email" : "Username"}</span>
          <div className="adm-input-ico">
            <FaUser aria-hidden />
            <input
              className="adm-input"
              type={LOGIN_USES_EMAIL ? "email" : "text"}
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setError("");
              }}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
        </label>

        <label className="adm-field">
          <span>Password</span>
          <div className="adm-input-ico">
            <FaLock aria-hidden />
            <input
              className="adm-input"
              type={show ? "text" : "password"}
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setError("");
              }}
              autoComplete="current-password"
              required
            />
            <button type="button" className="adm-input-ico__btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </label>

        {error && (
          <p className="adm-error" role="alert">
            {error}
          </p>
        )}

        <button className="adm-btn adm-btn--red adm-btn--block" type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>

        {import.meta.env.DEV && !LOGIN_USES_EMAIL && <p className="adm-hint">Dev login: admin / bfc@admin123 (change in .env)</p>}
      </form>
    </div>
  );
}
