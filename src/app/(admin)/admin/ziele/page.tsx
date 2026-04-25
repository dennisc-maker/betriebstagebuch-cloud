import { db } from "@/lib/db";
import { monthlyTargets } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, Target } from "lucide-react";
import { TargetsEditor } from "./targets-editor";

const MONTH_LABELS = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

const CATEGORIES = ["technik", "fahrer", "extern", "infrastruktur", "sonstiges"] as const;

export default async function ZielePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10);
  const month = parseInt(sp.month ?? String(now.getMonth() + 1), 10);

  const targets = await db
    .select()
    .from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, year), eq(monthlyTargets.month, month)))
    .orderBy(asc(monthlyTargets.faultCategory));

  // Fill missing categories
  const filled = CATEGORIES.map((cat) => {
    const existing = targets.find((t) => t.faultCategory === cat);
    return existing ?? { year, month, faultCategory: cat, maxCount: 0, setBy: null, setAt: "" };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin" style={{ display: "inline-flex", gap: 4, fontSize: 11.5, color: "var(--ink-500)", textDecoration: "none", marginBottom: 6 }}>
            <ChevronLeft size={12} /> Admin-Bereich
          </Link>
          <div className="page-eyebrow">Sollwerte · Ausschlag-Schwellen pro Kategorie</div>
          <h1 className="page-title">
            <Target size={24} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--brand-700)" }} />
            Monatsziele
          </h1>
          <p className="page-sub">{MONTH_LABELS[month - 1]} {year}</p>
        </div>
        <div className="page-actions">
          <Link href={`/admin/ziele?year=${month === 1 ? year - 1 : year}&month=${month === 1 ? 12 : month - 1}`} className="btn btn-sm">
            ← Vormonat
          </Link>
          <Link href={`/admin/ziele?year=${month === 12 ? year + 1 : year}&month=${month === 12 ? 1 : month + 1}`} className="btn btn-sm">
            Nächster Monat →
          </Link>
        </div>
      </div>

      <TargetsEditor year={year} month={month} initial={filled} />
    </>
  );
}
