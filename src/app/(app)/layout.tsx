import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { incidents, faultCatalog, monthlyTargets } from "@/lib/db/schema";
import { sql, and, eq, gte, lt, isNull } from "drizzle-orm";
import { touchSession } from "@/lib/sessions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  await touchSession(session.userId).catch(() => {});

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

  const [openCount] = await db
    .select({ c: sql<number>`count(*)` })
    .from(incidents)
    .where(and(eq(incidents.status, "offen"), isNull(incidents.deletedAt)));

  const targets = await db
    .select()
    .from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, year), eq(monthlyTargets.month, month)));

  const byCat = await db
    .select({ category: faultCatalog.category, c: sql<number>`count(*)` })
    .from(incidents)
    .innerJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .where(
      and(
        gte(incidents.incidentDate, monthStart),
        lt(incidents.incidentDate, nextMonth),
        isNull(incidents.deletedAt),
      ),
    )
    .groupBy(faultCatalog.category);

  let ausschlagCount = 0;
  for (const t of targets) {
    const actual = Number(byCat.find((c) => c.category === t.faultCategory)?.c ?? 0);
    if (actual > t.maxCount) ausschlagCount++;
  }

  return (
    <AppShell
      session={session}
      openCount={Number(openCount?.c ?? 0)}
      ausschlagCount={ausschlagCount}
    >
      {children}
    </AppShell>
  );
}
