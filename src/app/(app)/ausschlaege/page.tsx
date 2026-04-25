import { db } from "@/lib/db";
import { incidents, faultCatalog, monthlyTargets, busLines } from "@/lib/db/schema";
import { sql, and, gte, lt, eq, isNull, desc } from "drizzle-orm";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

const MONTH_LABELS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export default async function AusschlaegePage() {
  const [{ maxDate }] = await db
    .select({ maxDate: sql<string>`max(${incidents.incidentDate})` })
    .from(incidents)
    .where(isNull(incidents.deletedAt));

  const refDate = maxDate ?? new Date().toISOString().slice(0, 10);
  const [yearStr, monthStr] = refDate.slice(0, 7).split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "3", 10);

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const conds = [
    gte(incidents.incidentDate, monthStart),
    lt(incidents.incidentDate, nextMonth),
    isNull(incidents.deletedAt),
  ];

  const byCategory = await db
    .select({ category: faultCatalog.category, c: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(and(...conds))
    .groupBy(faultCatalog.category);

  const targets = await db
    .select()
    .from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, year), eq(monthlyTargets.month, month)));

  const cards = targets.map((t) => {
    const actual = Number(byCategory.find((c) => c.category === t.faultCategory)?.c ?? 0);
    const ratio = actual / t.maxCount;
    const tone: "ok" | "warn" | "critical" =
      ratio < 0.8 ? "ok" : ratio < 1.0 ? "warn" : "critical";
    return { ...t, actual, ratio, tone };
  });

  const problemLines = await db
    .select({
      line: busLines.lineNumber,
      lineName: busLines.name,
      c: sql<number>`count(*)`,
    })
    .from(incidents)
    .innerJoin(busLines, eq(incidents.lineId, busLines.id))
    .where(and(...conds))
    .groupBy(busLines.lineNumber, busLines.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const criticalCount = cards.filter((c) => c.tone === "critical").length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Monatsausschläge · Soll-Ist-Vergleich</div>
          <h1 className="page-title">
            {criticalCount > 0 ? (
              <AlertTriangle size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--sev-critical)" }} />
            ) : (
              <CheckCircle size={26} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--sev-ok)" }} />
            )}
            {MONTH_LABELS[month - 1]} {year}
          </h1>
          <p className="page-sub">
            {criticalCount > 0
              ? `${criticalCount} Kategorie${criticalCount === 1 ? "" : "n"} über Sollwert · Gegensteuern erforderlich`
              : "Alle Kategorien innerhalb des Solls"}
          </p>
        </div>
      </div>

      {/* Ampel-Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        {cards.map((c) => (
          <SignalCard key={c.faultCategory} card={c} />
        ))}
      </div>

      {/* Problem lines */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={16} style={{ color: "var(--sev-warning)" }} />
              Auffällige Linien diesen Monat
            </div>
            <div className="card-sub">Top 5 mit höchstem Vorfall-Aufkommen</div>
          </div>
        </div>
        <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {problemLines.map((l) => {
            const max = Math.max(...problemLines.map((x) => Number(x.c)));
            const pct = (Number(l.c) / max) * 100;
            return (
              <div key={l.line}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <span
                      className="code"
                      style={{
                        background: "var(--brand-50)",
                        padding: "1px 6px",
                        borderRadius: 4,
                        marginRight: 8,
                      }}
                    >
                      {l.line}
                    </span>
                    <span style={{ color: "var(--ink-600)" }}>{l.lineName ?? ""}</span>
                  </div>
                  <span className="num code" style={{ fontWeight: 600, color: "var(--ink-800)" }}>
                    {l.c} Vorfälle
                  </span>
                </div>
                <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: "var(--accent)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SignalCard({
  card,
}: {
  card: {
    faultCategory: string;
    actual: number;
    maxCount: number;
    ratio: number;
    tone: "ok" | "warn" | "critical";
  };
}) {
  const cfg = {
    ok: {
      label: "Innerhalb Soll",
      Icon: CheckCircle,
      iconColor: "var(--sev-ok)",
      barColor: "var(--sev-ok)",
      bgTint: "rgba(22, 163, 74, 0.04)",
      borderTint: "rgba(22, 163, 74, 0.18)",
    },
    warn: {
      label: "Achtung",
      Icon: AlertCircle,
      iconColor: "#b45309",
      barColor: "var(--sev-warning)",
      bgTint: "rgba(245, 158, 11, 0.05)",
      borderTint: "rgba(245, 158, 11, 0.22)",
    },
    critical: {
      label: "Ausschlag",
      Icon: AlertTriangle,
      iconColor: "var(--sev-critical)",
      barColor: "var(--sev-critical)",
      bgTint: "rgba(220, 38, 38, 0.05)",
      borderTint: "rgba(220, 38, 38, 0.25)",
    },
  }[card.tone];
  const Icon = cfg.Icon;
  const pct = Math.min(card.ratio * 100, 100);
  const tickPos = Math.min(card.maxCount, card.actual) / Math.max(card.actual, card.maxCount) * 100;
  const overshoot = card.actual > card.maxCount ? card.actual - card.maxCount : 0;

  return (
    <div
      className="card card-pad"
      style={{
        background: cfg.bgTint,
        borderColor: cfg.borderTint,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div className="metric-label" style={{ color: cfg.iconColor }}>
            {cfg.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              textTransform: "capitalize",
              marginTop: 2,
            }}
          >
            {card.faultCategory}
          </div>
        </div>
        <Icon size={24} style={{ color: cfg.iconColor }} />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span className="metric" style={{ color: cfg.iconColor }}>{card.actual}</span>
        <span style={{ fontSize: 13, color: "var(--ink-600)" }}>/ Soll {card.maxCount}</span>
      </div>

      {/* Soll/Ist bar */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <div
          style={{
            height: 6,
            background: "rgba(255, 255, 255, 0.6)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: cfg.barColor,
              borderRadius: 3,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: `${tickPos}%`,
            top: -2,
            width: 2,
            height: 10,
            background: "var(--ink-700)",
            transform: "translateX(-1px)",
          }}
        />
        <div
          style={{
            fontSize: 9.5,
            color: "var(--ink-500)",
            marginTop: 4,
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: `${tickPos}%`,
              transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            SOLL
          </span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {card.tone === "critical" ? (
          <div style={{ fontSize: 12, color: "var(--ink-700)" }}>
            <p style={{ margin: 0, marginBottom: 8 }}>
              Überschritten um <strong>{overshoot}</strong> Vorfälle (
              <strong>+{Math.round(((card.actual - card.maxCount) / card.maxCount) * 100)}%</strong>).
            </p>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: "var(--sev-critical)",
                color: "#fff",
                borderColor: "var(--sev-critical)",
              }}
            >
              Gegensteuern →
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
            Noch {card.maxCount - card.actual} bis Soll erreicht
          </div>
        )}
      </div>
    </div>
  );
}
