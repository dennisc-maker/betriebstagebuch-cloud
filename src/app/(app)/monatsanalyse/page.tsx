import { db } from "@/lib/db";
import { incidents, faultCatalog, busLines, outageReasons } from "@/lib/db/schema";
import { sql, and, gte, lt, eq, isNull, desc, asc } from "drizzle-orm";
import { MonthCharts } from "./month-charts";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";

const MONTH_LABELS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export default async function MonatsanalysePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const [{ maxDate }] = await db
    .select({ maxDate: sql<string>`max(${incidents.incidentDate})` })
    .from(incidents)
    .where(isNull(incidents.deletedAt));

  const refMonth = sp.month ?? (maxDate ?? new Date().toISOString().slice(0, 10)).slice(0, 7);
  const [yearStr, monthStr] = refMonth.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "3", 10);

  const monthStart = `${refMonth}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonthStr = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const prevMonthStart = `${prevMonth}-01`;
  const prevMonthEnd = monthStart;

  const conds = [
    gte(incidents.incidentDate, monthStart),
    lt(incidents.incidentDate, nextMonth),
    isNull(incidents.deletedAt),
  ];

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(incidents).where(and(...conds));
  const [{ prevTotal }] = await db
    .select({ prevTotal: sql<number>`count(*)` })
    .from(incidents)
    .where(and(gte(incidents.incidentDate, prevMonthStart), lt(incidents.incidentDate, prevMonthEnd), isNull(incidents.deletedAt)));
  const [{ critical }] = await db
    .select({ critical: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(and(...conds, eq(faultCatalog.severity, "critical")));

  const topFaults = await db
    .select({
      faultText: faultCatalog.faultText,
      faultCode: faultCatalog.faultCode,
      category: faultCatalog.category,
      c: sql<number>`count(*)`,
    })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(and(...conds))
    .groupBy(faultCatalog.id)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const categories = await db
    .select({ category: faultCatalog.category, c: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(and(...conds))
    .groupBy(faultCatalog.category);

  const byLine = await db
    .select({ line: busLines.lineNumber, c: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(busLines, eq(incidents.lineId, busLines.id))
    .where(and(...conds))
    .groupBy(busLines.lineNumber)
    .orderBy(desc(sql`count(*)`))
    .limit(15);

  const byReason = await db
    .select({ reason: outageReasons.reasonLabel, c: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(outageReasons, eq(incidents.outageReasonId, outageReasons.id))
    .where(and(...conds))
    .groupBy(outageReasons.reasonLabel)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const byDayShift = await db
    .select({ day: incidents.incidentDate, shift: incidents.shift, c: sql<number>`count(*)` })
    .from(incidents)
    .where(and(...conds))
    .groupBy(incidents.incidentDate, incidents.shift)
    .orderBy(asc(incidents.incidentDate));

  const total_n = Number(total ?? 0);
  const prev_n = Number(prevTotal ?? 0);
  const critical_n = Number(critical ?? 0);
  const delta = prev_n > 0 ? Math.round(((total_n - prev_n) / prev_n) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Monatsanalyse · Trend & Verteilung</div>
          <h1 className="page-title">
            <BarChart3 size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            {MONTH_LABELS[month - 1]} {year}
          </h1>
          <p className="page-sub">{total_n.toLocaleString("de-DE")} Vorfälle gesamt</p>
        </div>
        <div className="page-actions">
          <Link href={`/monatsanalyse?month=${prevMonth}`} className="btn btn-sm">
            <ChevronLeft size={14} />
            {MONTH_LABELS[(month - 2 + 12) % 12]}
          </Link>
          <Link href={`/monatsanalyse?month=${nextMonthStr}`} className="btn btn-sm">
            {MONTH_LABELS[month % 12]}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <KPICard label="Vorfälle gesamt" value={total_n} />
        <KPICard
          label="vs. Vormonat"
          value={delta > 0 ? `+${delta}%` : `${delta}%`}
          accent={delta > 0 ? "warning" : "ok"}
        />
        <KPICard label="Davon kritisch" value={critical_n} accent="critical" />
        <KPICard
          label="Quote kritisch"
          value={total_n > 0 ? `${Math.round((critical_n / total_n) * 100)}%` : "0%"}
        />
      </div>

      <MonthCharts
        topFaults={topFaults.map((f) => ({
          name: `${f.faultCode} ${f.faultText.slice(0, 40)}${f.faultText.length > 40 ? "…" : ""}`,
          value: Number(f.c),
        }))}
        categories={categories.map((c) => ({ name: c.category, value: Number(c.c) }))}
        byLine={byLine.map((l) => ({ name: l.line, value: Number(l.c) }))}
        byReason={byReason.map((r) => ({
          name: r.reason.length > 40 ? r.reason.slice(0, 40) + "…" : r.reason,
          value: Number(r.c),
        }))}
        byDayShift={byDayShift.map((x) => ({ day: x.day, shift: x.shift, count: Number(x.c) }))}
      />
    </>
  );
}

function KPICard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "critical" | "warning" | "ok";
}) {
  const dotColor =
    accent === "critical"
      ? "var(--sev-critical)"
      : accent === "warning"
        ? "var(--sev-warning)"
        : accent === "ok"
          ? "var(--sev-ok)"
          : null;
  return (
    <div className="card card-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="metric-label">{label}</div>
        {dotColor && <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, marginTop: 6 }} />}
      </div>
      <div className="metric" style={{ marginTop: 8 }}>{value}</div>
    </div>
  );
}
