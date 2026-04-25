import { db } from "@/lib/db";
import { incidents, faultCatalog, vehicles, busLines, dispatchers, drivers, outageReasons } from "@/lib/db/schema";
import { sql, and, eq, isNull, desc, asc } from "drizzle-orm";
import { formatDateShort, SHIFT_LABEL } from "@/lib/utils";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { ExportButtons } from "./export-buttons";

export default async function TagesberichtPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; shift?: string; line?: string; status?: string }>;
}) {
  const sp = await searchParams;

  const [{ maxDate }] = await db
    .select({ maxDate: sql<string>`max(${incidents.incidentDate})` })
    .from(incidents)
    .where(isNull(incidents.deletedAt));

  const date = sp.date ?? maxDate ?? new Date().toISOString().slice(0, 10);
  const filterShift = sp.shift;
  const filterStatus = sp.status;

  const conds = [eq(incidents.incidentDate, date), isNull(incidents.deletedAt)];
  if (filterShift) conds.push(eq(incidents.shift, filterShift as "frueh" | "mittel" | "spaet"));
  if (filterStatus) conds.push(eq(incidents.status, filterStatus as "offen" | "in_bearbeitung" | "abgeschlossen"));

  const rows = await db
    .select({
      id: incidents.id,
      time: incidents.incidentTime,
      shift: incidents.shift,
      status: incidents.status,
      faultText: faultCatalog.faultText,
      faultCode: faultCatalog.faultCode,
      severity: faultCatalog.severity,
      vehicle: vehicles.vehicleNumber,
      line: busLines.lineNumber,
      dispatcher: dispatchers.name,
      driver: drivers.name,
      measureText: incidents.measureText,
      outageReason: outageReasons.reasonLabel,
    })
    .from(incidents)
    .leftJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .leftJoin(dispatchers, eq(incidents.dispatcherId, dispatchers.id))
    .leftJoin(drivers, eq(incidents.driverId, drivers.id))
    .leftJoin(outageReasons, eq(incidents.outageReasonId, outageReasons.id))
    .where(and(...conds))
    .orderBy(asc(incidents.incidentTime));

  const dates = await db
    .select({ d: incidents.incidentDate, c: sql<number>`count(*)` })
    .from(incidents)
    .where(isNull(incidents.deletedAt))
    .groupBy(incidents.incidentDate)
    .orderBy(desc(incidents.incidentDate))
    .limit(60);

  const idx = dates.findIndex((d) => d.d === date);
  const prevDate = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1]?.d : null;
  const nextDate = idx > 0 ? dates[idx - 1]?.d : null;

  const byShift = (["frueh", "mittel", "spaet"] as const).map((s) => ({
    shift: s,
    count: rows.filter((r) => r.shift === s).length,
  }));

  const bySeverity = {
    critical: rows.filter((r) => r.severity === "critical").length,
    major: rows.filter((r) => r.severity === "major").length,
    minor: rows.filter((r) => r.severity === "minor").length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Tagesbericht · {date}</div>
          <h1 className="page-title">{formatDateShort(date)}</h1>
          <p className="page-sub">
            {rows.length} Vorfälle · Frühschicht {byShift[0]!.count} · Mittelschicht {byShift[1]!.count} · Spätschicht {byShift[2]!.count}
          </p>
        </div>
        <div className="page-actions">
          {prevDate && (
            <Link href={`/tagesbericht?date=${prevDate}`} className="btn btn-sm">
              <ChevronLeft size={14} />
              {formatDateShort(prevDate)}
            </Link>
          )}
          {nextDate && (
            <Link href={`/tagesbericht?date=${nextDate}`} className="btn btn-sm">
              {formatDateShort(nextDate)}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <SummaryCard label="Gesamt" value={rows.length} />
        <SummaryCard label="Kritisch" value={bySeverity.critical} accent="critical" />
        <SummaryCard label="Major" value={bySeverity.major} accent="warning" />
        <SummaryCard label="Minor" value={bySeverity.minor} />
      </div>

      {/* Filters */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 8 }}>
          Filter
        </span>
        <FilterChip href={`/tagesbericht?date=${date}`} active={!filterShift && !filterStatus} label="Alle" />
        {(["frueh", "mittel", "spaet"] as const).map((s) => (
          <FilterChip
            key={s}
            href={`/tagesbericht?date=${date}&shift=${s}`}
            active={filterShift === s}
            label={SHIFT_LABEL[s]}
          />
        ))}
        <span style={{ width: 1, height: 18, background: "var(--hair)", margin: "0 4px" }} />
        <FilterChip href={`/tagesbericht?date=${date}&status=offen`} active={filterStatus === "offen"} label="Offen" />
        <FilterChip
          href={`/tagesbericht?date=${date}&status=in_bearbeitung`}
          active={filterStatus === "in_bearbeitung"}
          label="In Arbeit"
        />
        <div style={{ flex: 1 }} />
        <ExportButtons rows={rows.map(r => ({
          time: r.time, shift: r.shift, vehicle: r.vehicle, line: r.line,
          faultCode: r.faultCode, faultText: r.faultText, dispatcher: r.dispatcher,
          measureText: r.measureText, status: r.status,
        }))} date={date} />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Schicht</th>
              <th>Fahrzeug</th>
              <th>Linie</th>
              <th>Fehler / Störung</th>
              <th>Disponent</th>
              <th>Maßnahme</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 60, color: "var(--ink-500)" }}>
                  Keine Vorfälle an diesem Tag
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="code num">{r.time}</td>
                <td>
                  <span className={`pill pill-${r.shift}`}>{SHIFT_LABEL[r.shift as "frueh"]}</span>
                </td>
                <td style={{ fontWeight: 500 }}>{r.vehicle ?? "—"}</td>
                <td>
                  {r.line ? (
                    <span className="code" style={{ background: "var(--brand-50)", padding: "1px 6px", borderRadius: 4 }}>
                      {r.line}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {r.faultText ? (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span className="sev-dot" data-sev={r.severity ?? "minor"} style={{ marginTop: 6 }} />
                      {r.faultCode && (
                        <span className="code" style={{ color: "var(--ink-500)", paddingTop: 1 }}>
                          {r.faultCode}
                        </span>
                      )}
                      <span style={{ flex: 1 }}>{r.faultText}</span>
                    </div>
                  ) : r.outageReason ? (
                    <span style={{ color: "var(--sev-warning)" }}>Linienausfall: {r.outageReason}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ color: "var(--ink-600)" }}>{r.dispatcher ?? "—"}</td>
                <td
                  style={{
                    fontSize: 12,
                    color: "var(--ink-600)",
                    maxWidth: 220,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={r.measureText ?? undefined}
                >
                  {r.measureText ?? "—"}
                </td>
                <td>
                  <span
                    className={
                      "pill " +
                      (r.status === "abgeschlossen"
                        ? "pill-ok"
                        : r.status === "in_bearbeitung"
                          ? "pill-info"
                          : "pill-warning")
                    }
                  >
                    {r.status === "abgeschlossen"
                      ? "Abgeschlossen"
                      : r.status === "in_bearbeitung"
                        ? "In Arbeit"
                        : "Offen"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "critical" | "warning";
}) {
  const accentColor =
    accent === "critical" ? "var(--sev-critical)" : accent === "warning" ? "var(--sev-warning)" : null;
  return (
    <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {accentColor && <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor }} />}
      <div style={{ flex: 1 }}>
        <div className="metric-label">{label}</div>
        <div className="metric" style={{ fontSize: 24 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className="chip" data-on={active ? "true" : "false"} style={{ textDecoration: "none" }}>
      {label}
    </Link>
  );
}
