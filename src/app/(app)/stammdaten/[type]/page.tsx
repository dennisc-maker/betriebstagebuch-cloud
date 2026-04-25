import { db } from "@/lib/db";
import {
  dispatchers, drivers, vehicles, busLines, faultCatalog, outageReasons,
  measureTemplates, driverMessageTypes, notifiedParties, workshopStaff,
} from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, Database } from "lucide-react";
import { notFound } from "next/navigation";

const TYPE_CONFIG = {
  disponenten: { label: "Disponenten", table: dispatchers, columns: ["name", "email"] },
  werkstatt: { label: "Werkstatt", table: workshopStaff, columns: ["name", "roleLabel"] },
  fahrer: { label: "Fahrpersonal", table: drivers, columns: ["name", "employeeId"] },
  fahrzeuge: { label: "Fahrzeuge", table: vehicles, columns: ["vehicleNumber", "licensePlate", "vehicleType"] },
  linien: { label: "Linien", table: busLines, columns: ["lineNumber", "name"] },
  fehlerkatalog: { label: "Fehlerkatalog", table: faultCatalog, columns: ["faultCode", "faultText", "category", "severity"] },
  ausfallgruende: { label: "Ausfall-Gründe", table: outageReasons, columns: ["reasonCode", "reasonLabel"] },
  massnahmen: { label: "Maßnahmen-Vorlagen", table: measureTemplates, columns: ["label", "isQuickPick"] },
  fahrermeldungen: { label: "Fahrer-Meldungen", table: driverMessageTypes, columns: ["typeCode", "label"] },
  informierte: { label: "Informierte Stellen", table: notifiedParties, columns: ["name", "email", "phone", "category"] },
} as const;

const COLUMN_LABELS: Record<string, string> = {
  name: "Name", email: "E-Mail", roleLabel: "Rolle", employeeId: "Personalnr.",
  vehicleNumber: "Fahrzeug-Nr.", licensePlate: "Kennzeichen", vehicleType: "Fahrzeugtyp",
  lineNumber: "Linien-Nr.", faultCode: "Code", faultText: "Beschreibung",
  category: "Kategorie", severity: "Schwere", reasonCode: "Code",
  reasonLabel: "Grund", label: "Bezeichnung", isQuickPick: "Quick-Pick",
  typeCode: "Code", phone: "Telefon",
};

export default async function StammdatenTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
  if (!cfg) notFound();

  const rows = await db.select().from(cfg.table).orderBy(asc(cfg.table.id));

  return (
    <>
      <div className="page-head">
        <div>
          <Link
            href="/stammdaten"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11.5,
              color: "var(--ink-500)",
              textDecoration: "none",
              marginBottom: 6,
            }}
          >
            <ChevronLeft size={12} />
            Stammdaten-Übersicht
          </Link>
          <h1 className="page-title">
            <Database size={24} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            {cfg.label}
          </h1>
          <p className="page-sub">{rows.length.toLocaleString("de-DE")} Einträge · Read-only</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              {cfg.columns.map((col) => (
                <th key={col}>{COLUMN_LABELS[col] ?? col}</th>
              ))}
              <th style={{ width: 100 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: Record<string, unknown>, i) => (
              <tr key={String(row.id)}>
                <td className="code num" style={{ color: "var(--ink-500)" }}>{i + 1}</td>
                {cfg.columns.map((col) => (
                  <td key={col}>
                    {col === "faultCode" ||
                    col === "reasonCode" ||
                    col === "typeCode" ||
                    col === "vehicleNumber" ||
                    col === "lineNumber" ? (
                      <span
                        className="code"
                        style={{
                          background: "var(--brand-50)",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {String(row[col] ?? "—")}
                      </span>
                    ) : col === "severity" ? (
                      <span
                        className={
                          "pill " +
                          (row[col] === "critical"
                            ? "pill-critical"
                            : row[col] === "major"
                              ? "pill-warning"
                              : "pill-neutral")
                        }
                      >
                        {String(row[col] ?? "—")}
                      </span>
                    ) : col === "isQuickPick" ? (
                      row[col] ? (
                        <span style={{ color: "var(--sev-ok)" }}>Ja</span>
                      ) : (
                        <span style={{ color: "var(--ink-400)" }}>—</span>
                      )
                    ) : (
                      <span>{String(row[col] ?? "—")}</span>
                    )}
                  </td>
                ))}
                <td>
                  {row.isActive !== false ? (
                    <span className="pill pill-ok">Aktiv</span>
                  ) : (
                    <span className="pill pill-neutral">Inaktiv</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
