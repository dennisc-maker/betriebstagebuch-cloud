import { db } from "@/lib/db";
import { incidents, faultCatalog, vehicles, busLines, dispatchers, drivers } from "@/lib/db/schema";
import { sql, and, eq, isNull, desc, like, or, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { ListTree, Search, Filter } from "lucide-react";
import { formatDateShort, SHIFT_LABEL } from "@/lib/utils";
import { BulkBar, BulkCheckbox } from "./bulk-bar";
import { getSession } from "@/lib/auth";

const PAGE_SIZE = 50;

export default async function VorfaellePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    severity?: string;
    status?: string;
    shift?: string;
    line?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  const canDelete = session?.role === "betriebsleiter" || session?.role === "admin";
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const conds = [isNull(incidents.deletedAt)];
  if (sp.severity) conds.push(eq(faultCatalog.severity, sp.severity as "minor" | "major" | "critical"));
  if (sp.status) conds.push(eq(incidents.status, sp.status as "offen" | "in_bearbeitung" | "abgeschlossen"));
  if (sp.shift) conds.push(eq(incidents.shift, sp.shift as "frueh" | "mittel" | "spaet"));
  if (sp.line) conds.push(eq(busLines.lineNumber, sp.line));

  const q = sp.q?.trim();
  if (q) {
    conds.push(
      or(
        like(faultCatalog.faultText, `%${q}%`),
        like(faultCatalog.faultCode, `%${q}%`),
        like(vehicles.vehicleNumber, `%${q}%`),
        like(busLines.lineNumber, `%${q}%`),
        like(incidents.measureText, `%${q}%`),
        like(incidents.notes, `%${q}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: incidents.id,
      date: incidents.incidentDate,
      time: incidents.incidentTime,
      shift: incidents.shift,
      status: incidents.status,
      faultCode: faultCatalog.faultCode,
      faultText: faultCatalog.faultText,
      severity: faultCatalog.severity,
      vehicle: vehicles.vehicleNumber,
      line: busLines.lineNumber,
      lineName: busLines.name,
      dispatcher: dispatchers.name,
      driver: drivers.name,
      measureText: incidents.measureText,
    })
    .from(incidents)
    .leftJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .leftJoin(dispatchers, eq(incidents.dispatcherId, dispatchers.id))
    .leftJoin(drivers, eq(incidents.driverId, drivers.id))
    .where(and(...conds))
    .orderBy(desc(incidents.incidentDate), desc(incidents.incidentTime))
    .limit(PAGE_SIZE)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(incidents)
    .leftJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .where(and(...conds));

  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));

  // Group by date for visual structure
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = groups.get(r.date) ?? [];
    list.push(r);
    groups.set(r.date, list);
  }

  // Active filter pills
  const activeFilters: { key: string; label: string; href: string }[] = [];
  const baseUrl = (excludeKey?: string) => {
    const params = new URLSearchParams();
    if (sp.q && excludeKey !== "q") params.set("q", sp.q);
    if (sp.severity && excludeKey !== "severity") params.set("severity", sp.severity);
    if (sp.status && excludeKey !== "status") params.set("status", sp.status);
    if (sp.shift && excludeKey !== "shift") params.set("shift", sp.shift);
    if (sp.line && excludeKey !== "line") params.set("line", sp.line);
    return "/vorfaelle?" + params.toString();
  };
  if (sp.q) activeFilters.push({ key: "q", label: `Suche: "${sp.q}"`, href: baseUrl("q") });
  if (sp.severity) activeFilters.push({ key: "severity", label: `Schwere: ${sp.severity}`, href: baseUrl("severity") });
  if (sp.status) activeFilters.push({ key: "status", label: `Status: ${sp.status}`, href: baseUrl("status") });
  if (sp.shift) activeFilters.push({ key: "shift", label: `Schicht: ${sp.shift}`, href: baseUrl("shift") });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Übersicht · {Number(total).toLocaleString("de-DE")} Einträge gesamt</div>
          <h1 className="page-title">
            <ListTree size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Vorfälle
          </h1>
          <p className="page-sub">Alle erfassten Vorfälle · suchen, filtern, durchsuchen</p>
        </div>
      </div>

      {/* Filter bar */}
      <form
        action="/vorfaelle"
        method="GET"
        className="card card-pad"
        style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-400)",
            }}
          />
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Code, Fehler, Fahrzeug, Linie, Notiz…"
          />
        </div>

        <select name="severity" defaultValue={sp.severity ?? ""} className="select" style={{ width: 140 }}>
          <option value="">Schwere · alle</option>
          <option value="critical">Kritisch</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>

        <select name="status" defaultValue={sp.status ?? ""} className="select" style={{ width: 140 }}>
          <option value="">Status · alle</option>
          <option value="offen">Offen</option>
          <option value="in_bearbeitung">In Bearbeitung</option>
          <option value="abgeschlossen">Abgeschlossen</option>
        </select>

        <select name="shift" defaultValue={sp.shift ?? ""} className="select" style={{ width: 140 }}>
          <option value="">Schicht · alle</option>
          <option value="frueh">Frühschicht</option>
          <option value="mittel">Mittelschicht</option>
          <option value="spaet">Spätschicht</option>
        </select>

        <button type="submit" className="btn btn-primary btn-sm">
          <Filter size={13} />
          Anwenden
        </button>
        {activeFilters.length > 0 && (
          <Link href="/vorfaelle" className="btn btn-ghost btn-sm">
            Zurücksetzen
          </Link>
        )}
      </form>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {activeFilters.map((f) => (
            <Link key={f.key} href={f.href} className="chip" data-on="true" style={{ textDecoration: "none" }}>
              {f.label} ✕
            </Link>
          ))}
        </div>
      )}

      {/* Results */}
      {rows.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 60, color: "var(--ink-500)" }}>
          <Search size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ink-700)", marginBottom: 4 }}>
            Keine Vorfälle gefunden
          </div>
          <div style={{ fontSize: 13 }}>Filter lockern oder Suche anpassen</div>
        </div>
      ) : (
        <>
          <BulkBar totalIds={rows.map((r) => r.id)} canDelete={canDelete} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Array.from(groups.entries()).map(([date, items]) => (
            <div key={date} className="card">
              <div className="card-head" style={{ background: "var(--surface-2)" }}>
                <div className="card-title">{formatDateShort(date)}</div>
                <div className="card-sub">{items.length} Vorfälle</div>
              </div>
              <div>
                {items.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderBottom: i < items.length - 1 ? "1px solid var(--hair-soft)" : "none",
                    }}
                  >
                    <BulkCheckbox id={r.id} />
                    <Link
                      href={`/vorfaelle/${r.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                    <span className="sev-dot" data-sev={r.severity ?? "minor"} style={{ flexShrink: 0 }} />
                    <span className="code num" style={{ width: 38, color: "var(--ink-600)" }}>
                      {r.time}
                    </span>
                    <span className={`pill pill-${r.shift}`} style={{ padding: "1px 6px", fontSize: 10 }}>
                      {r.shift === "frueh" ? "F" : r.shift === "mittel" ? "M" : "S"}
                    </span>
                    {r.faultCode && (
                      <span className="code" style={{ color: "var(--ink-500)", minWidth: 56 }}>
                        {r.faultCode}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink-900)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.faultText ?? "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-500)",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {[
                          r.vehicle,
                          r.line && `Linie ${r.line}`,
                          r.driver,
                          r.dispatcher,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
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
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          {page > 1 && (
            <Link href={`/vorfaelle?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page - 1) })}`} className="btn btn-sm">
              ← Vorherige
            </Link>
          )}
          <span style={{ fontSize: 13, color: "var(--ink-600)", padding: "0 12px" }}>
            Seite {page} von {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/vorfaelle?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page + 1) })}`} className="btn btn-sm">
              Nächste →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
