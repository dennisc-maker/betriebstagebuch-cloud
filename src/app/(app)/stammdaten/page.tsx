import Link from "next/link";
import { db } from "@/lib/db";
import {
  dispatchers, drivers, vehicles, busLines, faultCatalog, outageReasons,
  measureTemplates, driverMessageTypes, notifiedParties, workshopStaff,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import {
  Database, ChevronRight, Users, Wrench, Bus, Route, AlertOctagon,
  FileText, ListChecks, MessageSquare, Phone, UserCog,
} from "lucide-react";

const TABLES = [
  { key: "fehlerkatalog", label: "Fehlerkatalog", icon: AlertOctagon, table: faultCatalog, accent: true },
  { key: "disponenten", label: "Disponenten", icon: Users, table: dispatchers },
  { key: "werkstatt", label: "Werkstatt", icon: Wrench, table: workshopStaff },
  { key: "fahrer", label: "Fahrpersonal", icon: UserCog, table: drivers },
  { key: "fahrzeuge", label: "Fahrzeuge", icon: Bus, table: vehicles },
  { key: "linien", label: "Linien", icon: Route, table: busLines },
  { key: "ausfallgruende", label: "Ausfall-Gründe", icon: FileText, table: outageReasons },
  { key: "massnahmen", label: "Maßnahmen-Vorlagen", icon: ListChecks, table: measureTemplates },
  { key: "fahrermeldungen", label: "Fahrer-Meldungen", icon: MessageSquare, table: driverMessageTypes },
  { key: "informierte", label: "Informierte Stellen", icon: Phone, table: notifiedParties },
];

export default async function StammdatenPage() {
  const counts = await Promise.all(
    TABLES.map(async (t) => {
      const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(t.table);
      return { ...t, count: Number(c) };
    }),
  );
  const totalCount = counts.reduce((a, b) => a + b.count, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Read-only Browser · {totalCount.toLocaleString("de-DE")} Einträge gesamt</div>
          <h1 className="page-title">
            <Database size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Stammdaten
          </h1>
          <p className="page-sub">
            Alle hinterlegten Listen · Bearbeiten erfolgt im Admin-Bereich durch den Betriebsleiter
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {counts.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              href={`/stammdaten/${t.key}`}
              className="card card-pad"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.12s, transform 0.06s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: t.accent ? "var(--accent-soft)" : "var(--brand-50)",
                  color: t.accent ? "var(--accent)" : "var(--brand-900)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 2 }}>
                  {t.count.toLocaleString("de-DE")} Einträge
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--ink-400)" }} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
