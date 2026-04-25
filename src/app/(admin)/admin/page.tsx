import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  dispatchers, drivers, vehicles, busLines, faultCatalog, outageReasons,
  measureTemplates, driverMessageTypes, notifiedParties, workshopStaff, users, incidents,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import {
  Settings, ChevronRight, Users, Wrench, Bus, Route, AlertOctagon, FileText,
  ListChecks, MessageSquare, Phone, UserCog, Shield, Target, ScrollText,
} from "lucide-react";

const CARDS = [
  { key: "fehlerkatalog", label: "Fehlerkatalog", icon: AlertOctagon, table: faultCatalog, accent: true, description: "Codes für Auswertung pflegen" },
  { key: "disponenten", label: "Disponenten", icon: Users, table: dispatchers, description: "Schichtleitung verwalten" },
  { key: "linien", label: "Linien", icon: Route, table: busLines, description: "Buslinien konfigurieren" },
  { key: "fahrzeuge", label: "Fahrzeuge", icon: Bus, table: vehicles, description: "Flotte verwalten" },
  { key: "fahrer", label: "Fahrpersonal", icon: UserCog, table: drivers, description: "Fahrer-Stammdaten" },
  { key: "werkstatt", label: "Werkstatt", icon: Wrench, table: workshopStaff, description: "Werkstatt-Personal" },
  { key: "ausfallgruende", label: "Ausfall-Gründe", icon: FileText, table: outageReasons, description: "Begründungen Linienausfall" },
  { key: "massnahmen", label: "Maßnahmen", icon: ListChecks, table: measureTemplates, description: "Vorlagen für Disposition" },
  { key: "fahrermeldungen", label: "Fahrer-Meldungen", icon: MessageSquare, table: driverMessageTypes, description: "Krank, Urlaub, Tausch" },
  { key: "informierte", label: "Informierte Stellen", icon: Phone, table: notifiedParties, description: "Eskalations-Empfänger" },
];

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "betriebsleiter" && session.role !== "admin") redirect("/");

  const counts = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(users).then((r) => Number(r[0]?.c ?? 0)),
    db.select({ c: sql<number>`count(*)` }).from(incidents).then((r) => Number(r[0]?.c ?? 0)),
    ...CARDS.map((c) => db.select({ c: sql<number>`count(*)` }).from(c.table).then((r) => Number(r[0]?.c ?? 0))),
  ]);
  const userCount = counts[0];
  const incidentCount = counts[1];
  const tableCounts = counts.slice(2);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Verwaltung · Nur für Betriebsleiter</div>
          <h1 className="page-title">
            <Settings size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Admin-Bereich
          </h1>
          <p className="page-sub">Stammdaten pflegen, Benutzer verwalten, Sollwerte definieren</p>
        </div>
      </div>

      {/* Top KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <SystemCard label="Aktive Benutzer" value={userCount} icon={Shield} />
        <SystemCard label="Vorfälle gesamt" value={incidentCount} icon={ScrollText} />
        <SystemCard label="Stammtabellen" value={CARDS.length} icon={Settings} />
        <SystemCard label="Code-Einträge" value={tableCounts.reduce((a, b) => a + b, 0)} icon={Target} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            margin: "0 0 10px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Stammdaten pflegen
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          const count = tableCounts[i];
          return (
            <Link
              key={card.key}
              href={`/admin/stammdaten/${card.key}`}
              className="card card-pad"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                color: "inherit",
                ...(card.accent ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px rgba(217, 119, 6, 0.18)" } : {}),
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: card.accent ? "var(--accent-soft)" : "var(--brand-50)",
                  color: card.accent ? "var(--accent)" : "var(--brand-900)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{card.label}</span>
                  {card.accent && (
                    <span
                      className="pill pill-warning"
                      style={{ fontSize: 9, padding: "0px 5px" }}
                    >
                      Wichtig
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 2 }}>{card.description}</div>
                <div className="code" style={{ fontSize: 10.5, color: "var(--ink-500)", marginTop: 2 }}>
                  {count.toLocaleString("de-DE")} Einträge
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--ink-400)" }} />
            </Link>
          );
        })}
      </div>

      <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 14,
            fontWeight: 600,
            margin: "0 0 12px 0",
          }}
        >
          Weitere Verwaltung
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
          }}
        >
          <Link href="/admin/ziele" className="btn" style={{ justifyContent: "flex-start" }}>
            <Target size={15} />
            <span style={{ flex: 1, textAlign: "left" }}>Sollwerte / Monatsziele</span>
            <ChevronRight size={13} style={{ color: "var(--ink-400)" }} />
          </Link>
          <Link href="/admin/online" className="btn" style={{ justifyContent: "flex-start" }}>
            <Users size={15} />
            <span style={{ flex: 1, textAlign: "left" }}>Wer ist online</span>
            <ChevronRight size={13} style={{ color: "var(--ink-400)" }} />
          </Link>
          <Link href="/admin/backup" className="btn" style={{ justifyContent: "flex-start" }}>
            <ScrollText size={15} />
            <span style={{ flex: 1, textAlign: "left" }}>Backup & Export</span>
            <ChevronRight size={13} style={{ color: "var(--ink-400)" }} />
          </Link>
          <Link href="/admin/profil" className="btn" style={{ justifyContent: "flex-start" }}>
            <Shield size={15} />
            <span style={{ flex: 1, textAlign: "left" }}>Mein Profil & 2FA</span>
            <ChevronRight size={13} style={{ color: "var(--ink-400)" }} />
          </Link>
        </div>
      </div>
    </>
  );
}

function SystemCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Settings }) {
  return (
    <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Icon size={18} style={{ color: "var(--brand-300)" }} />
      <div style={{ flex: 1 }}>
        <div className="metric-label">{label}</div>
        <div className="metric" style={{ fontSize: 22 }}>{value.toLocaleString("de-DE")}</div>
      </div>
    </div>
  );
}
