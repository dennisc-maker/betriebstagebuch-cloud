"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PALETTE = ["#1e3a5f", "#326594", "#669dc7", "#d97706", "#fab424", "#dc2626", "#16a34a", "#3b82f6"];

type DayShift = { day: string; shift: string; count: number };

export function MonthCharts({
  topFaults,
  categories,
  byLine,
  byReason,
  byDayShift,
}: {
  topFaults: { name: string; value: number }[];
  categories: { name: string; value: number }[];
  byLine: { name: string; value: number }[];
  byReason: { name: string; value: number }[];
  byDayShift: DayShift[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Heatmap */}
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Heatmap: Tag x Schicht</h3>
        <Heatmap data={byDayShift} />
      </div>

      {/* Categories pie */}
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Fehler-Kategorien</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={categories}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(e) => `${e.name}: ${e.value}`}
            >
              {categories.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* By line */}
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Top Linien</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byLine}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#326594" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Outage reasons */}
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Linienausfall-Gruende</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byReason} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
            <Tooltip />
            <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top faults */}
      <div className="card p-5 lg:col-span-2">
        <h3 className="font-display font-semibold mb-4">Top 10 Fehler</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topFaults} layout="vertical" margin={{ left: 200 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={300} />
            <Tooltip />
            <Bar dataKey="value" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: DayShift[] }) {
  const days = Array.from(new Set(data.map((d) => d.day))).sort();
  const shifts: ("frueh" | "mittel" | "spaet")[] = ["frueh", "mittel", "spaet"];
  const max = Math.max(...data.map((d) => d.count), 1);

  if (days.length === 0) {
    return <div className="text-sm text-ink-subtle text-center py-8">Keine Daten in diesem Monat</div>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
        <div></div>
        <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((d) => (
            <div key={d} className="text-center text-[9px] text-ink-subtle font-mono">
              {d.slice(8)}
            </div>
          ))}
        </div>
      </div>
      {shifts.map((s) => (
        <div key={s} className="grid grid-cols-[100px_1fr] gap-2 items-center">
          <div className="text-xs font-medium capitalize">{s === "frueh" ? "Frühschicht" : s === "mittel" ? "Mittelschicht" : "Spätschicht"}</div>
          <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {days.map((d) => {
              const item = data.find((x) => x.day === d && x.shift === s);
              const count = item?.count ?? 0;
              const intensity = count / max;
              const bg =
                intensity === 0
                  ? "rgba(30, 58, 95, 0.04)"
                  : `rgba(30, 58, 95, ${0.15 + intensity * 0.7})`;
              return (
                <div
                  key={d + s}
                  className="aspect-square rounded-sm flex items-center justify-center text-[9px] font-mono text-white"
                  style={{ background: bg, color: intensity > 0.4 ? "white" : "rgb(30, 58, 95)" }}
                  title={`${d} · ${s}: ${count}`}
                >
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
