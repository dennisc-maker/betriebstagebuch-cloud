import Link from "next/link";
import { ChevronLeft, Download, Database, FileJson, FileSpreadsheet, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { incidents, users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export default async function BackupPage() {
  const [{ totalIncidents }] = await db
    .select({ totalIncidents: sql<number>`count(*)` })
    .from(incidents);
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)` })
    .from(users);

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin" style={{ display: "inline-flex", gap: 4, fontSize: 11.5, color: "var(--ink-500)", textDecoration: "none", marginBottom: 6 }}>
            <ChevronLeft size={12} /> Admin-Bereich
          </Link>
          <div className="page-eyebrow">Datensicherung & Export</div>
          <h1 className="page-title">
            <Database size={24} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Backup
          </h1>
          <p className="page-sub">
            {Number(totalIncidents).toLocaleString("de-DE")} Vorfälle · {Number(totalUsers)} Benutzer
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <BackupCard
          icon={Database}
          title="Supabase-Auto-Backups"
          description="Automatische tägliche Backups durch Supabase (Pro-Plan: 7 Tage Retention). Verwaltung im Supabase-Dashboard."
          href="https://supabase.com/dashboard"
          buttonText="Im Supabase-Dashboard öffnen"
          accent="primary"
        />
        <BackupCard
          icon={FileSpreadsheet}
          title="Vorfälle als CSV"
          description="Alle Vorfälle inklusive Stammdaten-Texte. UTF-8 mit BOM, Excel-kompatibel."
          href="/api/backup/incidents.csv"
          buttonText="CSV exportieren"
        />
        <BackupCard
          icon={FileJson}
          title="JSON-Export"
          description="Komplette Datenbank strukturiert als JSON. Geeignet für Migration auf anderes System."
          href="/api/backup/incidents.json"
          buttonText="JSON exportieren"
        />
      </div>

      <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertCircle size={20} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: "var(--ink-700)" }}>
            <strong>Empfehlung:</strong> Supabase erstellt täglich automatische Backups (Pro-Plan, 7 Tage Retention). Zusätzlich monatlicher CSV/JSON-Export für Langzeit-Archiv.
            <br />
            <strong style={{ marginTop: 6, display: "inline-block" }}>DSGVO:</strong> Daten in Frankfurt-Region (eu-central-1), Auftragsverarbeitungsvertrag mit Supabase abschließen.
          </div>
        </div>
      </div>
    </>
  );
}

function BackupCard({
  icon: Icon,
  title,
  description,
  href,
  buttonText,
  accent,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  href: string;
  buttonText: string;
  accent?: "primary";
}) {
  return (
    <div className="card card-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon size={20} style={{ color: accent ? "var(--accent)" : "var(--brand-700)" }} />
        <strong style={{ fontSize: 14 }}>{title}</strong>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ink-600)", marginBottom: 14, lineHeight: 1.5 }}>{description}</p>
      <a href={href} className={accent === "primary" ? "btn btn-primary btn-sm" : "btn btn-sm"} download>
        <Download size={13} />
        {buttonText}
      </a>
    </div>
  );
}
