"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Shield, Copy, Check } from "lucide-react";
import { enableTotp, disableTotp } from "./actions";

export function TotpSetup({
  enabled,
  setupData,
  username,
}: {
  enabled: boolean;
  setupData: { secret: string; qrDataUrl: string } | null;
  username: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const enable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setError(null);
    startTransition(async () => {
      const res = await enableTotp(setupData.secret, code);
      if (res.error) setError(res.error);
      else {
        setSuccess(true);
        setTimeout(() => router.refresh(), 1000);
      }
    });
  };

  const disable = () => {
    if (!confirm("2FA wirklich deaktivieren? Login geht dann wieder nur mit Passwort.")) return;
    startTransition(async () => {
      await disableTotp();
      router.refresh();
    });
  };

  const copySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (enabled) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <ShieldCheck size={32} style={{ color: "var(--sev-ok)" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>2FA ist aktiv</div>
            <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
              Beim nächsten Login fragen wir nach einem Code aus Ihrer Authenticator-App.
            </div>
          </div>
        </div>
        <button onClick={disable} disabled={pending} className="btn btn-sm">
          2FA deaktivieren
        </button>
      </div>
    );
  }

  if (!setupData) return null;

  return (
    <form onSubmit={enable} style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flexShrink: 0 }}>
        <img
          src={setupData.qrDataUrl}
          alt="2FA QR Code"
          style={{ width: 200, height: 200, border: "1px solid var(--hair)", borderRadius: 8 }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 260 }}>
        <ol style={{ fontSize: 13, color: "var(--ink-700)", lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
          <li>Authenticator-App öffnen (Google Authenticator, Authy, Microsoft Authenticator)</li>
          <li>QR-Code scannen ODER Schlüssel manuell eingeben:</li>
        </ol>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-2)",
            padding: "8px 10px",
            borderRadius: "var(--r-md)",
            margin: "10px 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
          }}
        >
          <span style={{ flex: 1, wordBreak: "break-all", letterSpacing: "0.05em" }}>
            {setupData.secret}
          </span>
          <button type="button" onClick={copySecret} className="icon-btn" aria-label="Kopieren">
            {copied ? <Check size={14} style={{ color: "var(--sev-ok)" }} /> : <Copy size={14} />}
          </button>
        </div>

        <ol style={{ fontSize: 13, color: "var(--ink-700)", lineHeight: 1.6, paddingLeft: 18, margin: 0 }} start={3}>
          <li>App zeigt 6-stelligen Code → unten eintragen → bestätigen.</li>
        </ol>

        <div style={{ marginTop: 14 }}>
          <label className="field-label">6-stelliger Code aus App</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="input code"
              style={{ width: 130, letterSpacing: "0.2em", textAlign: "center", fontSize: 16 }}
              placeholder="000000"
              autoFocus
            />
            <button type="submit" disabled={pending || code.length !== 6} className="btn btn-accent">
              <Shield size={14} /> 2FA aktivieren
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 10,
              background: "var(--sev-critical-bg)",
              color: "var(--sev-critical)",
              padding: "8px 12px",
              borderRadius: "var(--r-md)",
              fontSize: 12.5,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              marginTop: 10,
              background: "var(--sev-ok-bg)",
              color: "var(--sev-ok)",
              padding: "8px 12px",
              borderRadius: "var(--r-md)",
              fontSize: 12.5,
            }}
          >
            2FA aktiviert ✓
          </div>
        )}
      </div>
    </form>
  );
}
