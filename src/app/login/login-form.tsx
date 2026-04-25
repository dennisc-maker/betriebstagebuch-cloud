"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await loginAction({ username: user, password: pass, totpCode: totpCode || undefined });
    setPending(false);
    if (result?.requireTotp) {
      setRequireTotp(true);
      if (result.error) setError(result.error);
    } else if (result?.error) {
      setError(result.error);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <form className="login-card" onSubmit={submit}>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-500)",
            marginBottom: 6,
          }}
        >
          Anmelden
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Willkommen zurück
        </h2>
        <div style={{ fontSize: 13, color: "var(--ink-600)", marginTop: 6 }}>
          Lokales Netzwerk · Server <span className="code">10.0.4.12</span>
        </div>
      </div>

      <div className="field">
        <label className="field-label">Benutzername</label>
        <input
          className="input"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoFocus
          autoComplete="username"
        />
      </div>

      <div className="field">
        <label className="field-label">
          <span>Passwort</span>
          <a
            href="#"
            style={{ color: "var(--ink-500)", textDecoration: "none", fontWeight: 400 }}
          >
            Zurücksetzen
          </a>
        </label>
        <div style={{ position: "relative" }}>
          <input
            className="input"
            type={showPass ? "text" : "password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            style={{ paddingRight: 38 }}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowPass((s) => !s)}
            style={{ position: "absolute", right: 4, top: 4 }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--ink-700)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Auf diesem Gerät angemeldet bleiben
      </label>

      {requireTotp && (
        <div className="field" style={{ background: "var(--accent-soft)", padding: 12, borderRadius: "var(--r-md)" }}>
          <label className="field-label">2FA-Code (aus Authenticator-App)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
            className="input code"
            style={{ letterSpacing: "0.2em", textAlign: "center", fontSize: 16 }}
            placeholder="000000"
            autoFocus
            required
          />
          <div className="field-hint" style={{ marginTop: 4 }}>
            Code aus Google Authenticator, Authy, Microsoft Authenticator etc.
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "var(--sev-critical-bg)",
            color: "var(--sev-critical)",
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            border: "1px solid rgba(220, 38, 38, 0.2)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ height: 42, justifyContent: "center", fontSize: 14 }}
        disabled={pending}
      >
        {pending ? "Anmelden…" : "Anmelden"}
        {!pending && <ArrowRight size={15} />}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 11.5,
          color: "var(--ink-500)",
          marginTop: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--sev-ok)",
          }}
        />
        Server erreichbar · Daten lokal in Idar-Oberstein
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: "var(--ink-500)",
          paddingTop: 14,
          borderTop: "1px solid var(--hair)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--ink-700)" }}>Demo-Logins:</strong>
        <br />
        Disponent: <span className="code">andre</span> /{" "}
        <span className="code">demo</span>
        <br />
        Betriebsleiter: <span className="code">leiter</span> /{" "}
        <span className="code">demo</span>
      </div>
    </form>
  );
}
