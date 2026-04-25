import { db } from "@/lib/db";
import { incidents, faultCatalog, vehicles, busLines, dispatchers } from "@/lib/db/schema";
import { sql, and, eq, isNull, desc, or, inArray } from "drizzle-orm";
import Link from "next/link";
import { Wrench, Search } from "lucide-react";
import { formatDateShort, SHIFT_LABEL } from "@/lib/utils";
import { QuickStatusToggle } from "./quick-status-toggle";

export default async function WerkstattPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vehicle?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const conds = [
    isNull(incidents.deletedAt),
    or(eq(incidents.status, "offen"), eq(incidents.status, "in_bearbeitung"))!,
    eq(faultCatalog.category, "technik"),
  ];
  if (sp.vehicle) conds.push(eq(vehicles.vehicleNumber, sp.vehicle));

  const rows = await db
    .select({
      id: incidents.id,
      date: incidents.incidentDate,
      time: incidents.incidentTime,
      shift: incidents.shift,
      status: incidents.status,
      faultText: faultCatalog.faultText,
      faultCode: faultCatalog.faultCode,
      severity: faultCatalog.severity,
      vehicle: vehicles.vehicleNumber,
      line: busLines.lineNumber,
      dispatcher: dispatchers.name,
      measureText: incidents.measureText,
    })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .leftJoin(dispatchers, eq(incidents.dispatcherId, dispatchers.id))
    .where(and(...conds))
    .orderBy(desc(incidents.incidentDate), desc(incidents.incidentTime))
    .limit(200);

  const filtered = q
    ? rows.filter(
        (r) =>
          r.faultText?.toLowerCase().includes(q.toLowerCase()) ||
          r.vehicle?.toLowerCase().includes(q.toLowerCase()) ||
          r.faultCode?.toLowerCase().includes(q.toLowerCase()),
      )
    : rows;

  // Group by vehicle
  const byVehicle = new Map<string, typeof filtered>();
  for (const r of filtered) {
    const key = r.vehicle ?? "Ohne Fahrzeug";
    const list = byVehicle.get(key) ?? [];
    list.push(r);
    byVehicle.set(key, list);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Werkstatt-Inbox · {filtered.length} offene technische Vorfälle</div>
          <h1 className="page-title">
            <Wrench size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Werkstatt
          </h1>
          <p className="page-sub">Alle offenen Technik-Vorfälle · Status direkt setzen · pro Fahrzeug gruppiert</p>
        </div>
      </div>

      <form
        action="/werkstatt"
        method="GET"
        className="card card-pad"
        style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}
      >
        <Search size={14} style={{ color: "var(--ink-400)" }} />
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          className="input"
          style={{ flex: 1 }}
          placeholder="Fahrzeug, Fehler, Code…"
        />
        <button className="btn btn-primary btn-sm">Filtern</button>
        {q && (
          <Link href="/werkstatt" className="btn btn-ghost btn-sm">
            Zurücksetzen
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 60, color: "var(--ink-500)" }}>
          <Wrench size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ink-700)" }}>
            Keine offenen Werkstatt-Vorfälle
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Array.from(byVehicle.entries()).map(([vehicle, items]) => (
            <div key={vehicle} className="card">
              <div className="card-head">
                <div className="card-title" style={{ fontFamily: "var(--font-mono)" }}>{vehicle}</div>
                <div className="card-sub">{items.length} offene Vorfälle</div>
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
                    <span className="sev-dot" data-sev={r.severity} />
                    <span className="code num" style={{ width: 48, fontSize: 11, color: "var(--ink-500)" }}>
                      {r.date.slice(8)}.{r.date.slice(5, 7)} {r.time}
                    </span>
                    <Link
                      href={`/vorfaelle/${r.id}`}
                      style={{ flex: 1, fontSize: 13, color: "var(--ink-900)", textDecoration: "none" }}
                    >
                      <span className="code" style={{ marginRight: 6, color: "var(--ink-500)" }}>
                        {r.faultCode}
                      </span>
                      {r.faultText}
                      {r.measureText && (
                        <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 2 }}>
                          ↳ {r.measureText.slice(0, 80)}
                          {r.measureText.length > 80 ? "…" : ""}
                        </div>
                      )}
                    </Link>
                    <QuickStatusToggle id={r.id} status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
