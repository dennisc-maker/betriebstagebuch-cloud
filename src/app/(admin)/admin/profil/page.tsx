import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TotpSetup } from "./totp-setup";
import { generateTotpSecret, buildTotpUri, buildTotpQrDataUrl } from "@/lib/totp";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db
    .select({ id: users.id, username: users.username, fullName: users.fullName, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  // Pre-generate TOTP setup für Setup-Flow (nur wenn noch nicht aktiviert)
  let setupData: { secret: string; qrDataUrl: string } | null = null;
  if (!user.totpEnabled) {
    const secret = generateTotpSecret();
    const uri = buildTotpUri(user.username, secret);
    const qr = await buildTotpQrDataUrl(uri);
    setupData = { secret, qrDataUrl: qr };
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin" style={{ display: "inline-flex", gap: 4, fontSize: 11.5, color: "var(--ink-500)", textDecoration: "none", marginBottom: 6 }}>
            <ChevronLeft size={12} /> Admin-Bereich
          </Link>
          <div className="page-eyebrow">Persönliche Einstellungen</div>
          <h1 className="page-title">
            <Shield size={24} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Mein Profil
          </h1>
          <p className="page-sub">{user.fullName} · {user.username}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">Zwei-Faktor-Authentifizierung (2FA)</div>
          <div className="card-sub">
            {user.totpEnabled ? "Aktiviert · TOTP-App erforderlich beim Login" : "Empfohlen für Betriebsleiter"}
          </div>
        </div>
        <div className="card-pad">
          <TotpSetup
            enabled={user.totpEnabled}
            setupData={setupData}
            username={user.username}
          />
        </div>
      </div>

      <div className="card card-pad" style={{ background: "var(--surface-2)", fontSize: 12.5, color: "var(--ink-700)" }}>
        <strong>Was ist 2FA?</strong> Beim Login geben Sie zusätzlich zum Passwort einen 6-stelligen Code aus einer Authenticator-App ein (z.B. Google Authenticator, Microsoft Authenticator, Authy). Der Code wechselt alle 30 Sekunden. Selbst wenn jemand Ihr Passwort kennt, kommt er ohne den Code nicht rein.
      </div>
    </>
  );
}
