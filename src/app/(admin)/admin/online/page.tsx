import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { getActiveUsers } from "@/lib/sessions";

const ROLE_LABEL: Record<string, string> = {
  disponent: "Disponent",
  betriebsleiter: "Betriebsleiter",
  werkstatt: "Werkstatt",
  admin: "Admin",
};

export default async function OnlinePage() {
  const active = await getActiveUsers();

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin" style={{ display: "inline-flex", gap: 4, fontSize: 11.5, color: "var(--ink-500)", textDecoration: "none", marginBottom: 6 }}>
            <ChevronLeft size={12} /> Admin-Bereich
          </Link>
          <div className="page-eyebrow">Aktive Sessions · letzte 5 Minuten</div>
          <h1 className="page-title">
            <Users size={24} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Wer ist online
          </h1>
          <p className="page-sub">{active.length} aktive Benutzer</p>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 60, color: "var(--ink-500)" }}>
          Niemand online. (Aktivität erscheint hier nach erstem Klick eines Benutzers.)
        </div>
      ) : (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Live-Aktivität</div>
          </div>
          <div>
            {active.map((u) => {
              const initials = u.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const lastSeen = new Date(u.lastSeen);
              const secondsAgo = Math.floor((Date.now() - lastSeen.getTime()) / 1000);
              const ago = secondsAgo < 60 ? `Vor ${secondsAgo}s` : `Vor ${Math.floor(secondsAgo / 60)} Min`;
              return (
                <div
                  key={u.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 20px",
                    borderBottom: "1px solid var(--hair-soft)",
                  }}
                >
                  <div className="avatar lg">{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </div>
                  </div>
                  <span className="pill pill-ok">
                    <span className="sev-dot" data-sev="ok" style={{ background: "currentColor" }} />
                    Online · {ago}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
