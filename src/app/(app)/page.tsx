import { db } from "@/lib/db";
import {
  incidents,
  faultCatalog,
  vehicles,
  busLines,
  dispatchers,
} from "@/lib/db/schema";
import { sql, and, gte, lt, eq, isNull, desc } from "drizzle-orm";
import { formatDateShort, SHIFT_LABEL } from "@/lib/utils";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default async function DashboardPage() {
  const [{ maxDate }] = await db
    .select({ maxDate: sql<string>`max(${incidents.incidentDate})` })
    .from(incidents)
    .where(isNull(incidents.deletedAt));

  const refDate = maxDate ?? new Date().toISOString().slice(0, 10);
  const refMinus1 = new Date(new Date(refDate).getTime() - 86400000).toISOString().slice(0, 10);
  const refMinus7 = new Date(new Date(refDate).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const refMonth = refDate.slice(0, 7) + "-01";

  const [todayCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(incidents)
    .where(and(eq(incidents.incidentDate, refDate), isNull(incidents.deletedAt)));

  const [weekCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(incidents)
    .where(
      and(
        gte(incidents.incidentDate, refMinus7),
        isNull(incidents.deletedAt),
      ),
    );

  const [openCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(incidents)
    .where(and(eq(incidents.status, "offen"), isNull(incidents.deletedAt)));

  const [criticalMonth] = await db
    .select({ c: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(
      and(
        eq(faultCatalog.severity, "critical"),
        gte(incidents.incidentDate, refMonth),
        isNull(incidents.deletedAt),
      ),
    );

  const [yesterdayCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(incidents)
    .where(and(eq(incidents.incidentDate, refMinus1), isNull(incidents.deletedAt)));

  // Latest 8 incidents
  const latest = await db
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
    })
    .from(incidents)
    .leftJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .leftJoin(dispatchers, eq(incidents.dispatcherId, dispatchers.id))
    .where(isNull(incidents.deletedAt))
    .orderBy(desc(incidents.incidentDate), desc(incidents.incidentTime))
    .limit(8);

  // 7-day daily trend (sparkline data)
  const dailyTrend = await db
    .select({
      day: incidents.incidentDate,
      c: sql<number>`count(*)`,
    })
    .from(incidents)
    .where(
      and(
        gte(incidents.incidentDate, refMinus7),
        isNull(incidents.deletedAt),
      ),
    )
    .groupBy(incidents.incidentDate)
    .orderBy(incidents.incidentDate);

  // Top fault categories (week)
  const topFaults = await db
    .select({
      category: faultCatalog.category,
      c: sql<number>`count(*)`,
    })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(
      and(
        gte(incidents.incidentDate, refMinus7),
        isNull(incidents.deletedAt),
      ),
    )
    .groupBy(faultCatalog.category)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // By shift today
  const byShift = await db
    .select({
      shift: incidents.shift,
      c: sql<number>`count(*)`,
    })
    .from(incidents)
    .where(and(eq(incidents.incidentDate, refDate), isNull(incidents.deletedAt)))
    .groupBy(incidents.shift);

  const today_n = Number(todayCount?.c ?? 0);
  const yesterday_n = Number(yesterdayCount?.c ?? 0);
  const week_n = Number(weekCount?.c ?? 0);
  const open_n = Number(openCount?.c ?? 0);
  const crit_n = Number(criticalMonth?.c ?? 0);

  const todayDelta = today_n - yesterday_n;
  const weekAvg = Math.round(week_n / 7);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            Datenstand: {formatDateShort(refDate)}
            {refDate !== new Date().toISOString().slice(0, 10) && (
              <span style={{ marginLeft: 8, color: "var(--accent)", fontWeight: 600 }}>
                · Demo-Modus
              </span>
            )}
          </div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Tagesübersicht der disporelevanten Aktionen</p>
        </div>
        <div className="page-actions">
          <Link href="/erfassung" className="btn btn-accent">
            <Plus size={14} />
            Neuer Vorfall
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <MetricCard
          label="Heute"
          value={today_n}
          delta={todayDelta}
          deltaSuffix=" vs gestern"
          sparkline={dailyTrend.map((d) => Number(d.c))}
        />
        <MetricCard
          label="Diese Woche"
          value={week_n}
          delta={today_n - weekAvg}
          deltaSuffix=" vs Schnitt"
        />
        <MetricCard label="Offen" value={open_n} accent="warning" />
        <MetricCard label="Kritisch (Monat)" value={crit_n} accent="critical" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        {/* Live Feed */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Letzte Vorfälle</div>
              <div className="card-sub">Live-Feed · Klick öffnet Detail</div>
            </div>
            <Link
              href="/tagesbericht"
              style={{
                fontSize: 12,
                color: "var(--ink-600)",
                textDecoration: "none",
              }}
            >
              Alle anzeigen →
            </Link>
          </div>
          <div>
            {latest.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-500)" }}>
                Noch keine Vorfälle erfasst.{" "}
                <Link href="/erfassung" style={{ color: "var(--brand-700)" }}>
                  Ersten erfassen
                </Link>
              </div>
            )}
            {latest.map((inc, i) => (
              <Link
                key={inc.id}
                href={`/tagesbericht?date=${inc.date}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  borderBottom: i < latest.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.08s",
                }}
                className="feed-row"
              >
                <span
                  className="sev-dot"
                  data-sev={inc.severity ?? "minor"}
                  style={{ flexShrink: 0 }}
                />
                <span className="code num" style={{ width: 38, color: "var(--ink-600)" }}>
                  {inc.time}
                </span>
                <ShiftPill shift={inc.shift} compact />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink-900)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {inc.faultText ?? "—"}
                    {inc.faultCode && (
                      <span className="code" style={{ marginLeft: 6, color: "var(--ink-500)" }}>
                        [{inc.faultCode}]
                      </span>
                    )}
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
                    {[inc.vehicle, inc.line && `Linie ${inc.line}`, inc.dispatcher]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <StatusPill status={inc.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Top-Kategorien (7 Tage)</div>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topFaults.map((f) => {
                const max = Math.max(...topFaults.map((x) => Number(x.c)));
                const pct = (Number(f.c) / max) * 100;
                return (
                  <div key={f.category}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
                        {f.category}
                      </span>
                      <span className="num code" style={{ color: "var(--ink-600)" }}>
                        {f.c}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "var(--surface-2)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "var(--brand-700)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {topFaults.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--ink-500)", textAlign: "center", padding: 12 }}>
                  Keine Daten
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Schichten heute</div>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(["frueh", "mittel", "spaet"] as const).map((s) => {
                const c = Number(byShift.find((x) => x.shift === s)?.c ?? 0);
                return (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <ShiftPill shift={s} />
                    <span className="num metric" style={{ fontSize: 18 }}>
                      {c}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  delta,
  deltaSuffix,
  accent,
  sparkline,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaSuffix?: string;
  accent?: "critical" | "warning" | "ok";
  sparkline?: number[];
}) {
  const accentColor =
    accent === "critical"
      ? "var(--sev-critical)"
      : accent === "warning"
        ? "var(--sev-warning)"
        : accent === "ok"
          ? "var(--sev-ok)"
          : null;

  const deltaCls =
    delta == null
      ? "delta-flat"
      : delta > 0
        ? "delta-up"
        : delta < 0
          ? "delta-down"
          : "delta-flat";

  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="metric-label">{label}</div>
        {accentColor && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accentColor,
              marginTop: 6,
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="metric">{value}</span>
        {delta != null && (
          <span className={`metric-delta ${deltaCls}`}>
            <DeltaIcon size={12} />
            {delta > 0 ? "+" : ""}
            {delta}
            {deltaSuffix && <span style={{ color: "var(--ink-500)", fontWeight: 400 }}>{deltaSuffix}</span>}
          </span>
        )}
      </div>
      {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} />}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data) * 1.05;
  const min = Math.min(...data) * 0.9;
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const d = pts
    .map((p, i) => (i === 0 ? "M" : "L") + p[0]!.toFixed(2) + " " + p[1]!.toFixed(2))
    .join(" ");
  const area = d + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <path d={area} fill="var(--accent)" opacity="0.10" />
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map(
        (p, i) =>
          i === pts.length - 1 && <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill="var(--accent)" />,
      )}
    </svg>
  );
}

function ShiftPill({ shift, compact }: { shift: string | null; compact?: boolean }) {
  if (!shift) return null;
  const cls = "pill pill-" + shift;
  return (
    <span className={cls} style={compact ? { padding: "1px 6px", fontSize: 10 } : undefined}>
      {compact ? (shift === "frueh" ? "F" : shift === "mittel" ? "M" : "S") : SHIFT_LABEL[shift as "frueh"]}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "abgeschlossen" ? "pill pill-ok" : status === "in_bearbeitung" ? "pill pill-info" : "pill pill-warning";
  const label =
    status === "abgeschlossen" ? "Abgeschlossen" : status === "in_bearbeitung" ? "In Arbeit" : "Offen";
  return <span className={cls}>{label}</span>;
}
