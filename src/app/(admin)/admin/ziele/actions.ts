"use server";

import { db } from "@/lib/db";
import { monthlyTargets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveTargets(
  year: number,
  month: number,
  data: { faultCategory: string; maxCount: number }[],
) {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return { error: "Keine Berechtigung" };
  }

  for (const { faultCategory, maxCount } of data) {
    const existing = await db
      .select()
      .from(monthlyTargets)
      .where(
        and(
          eq(monthlyTargets.year, year),
          eq(monthlyTargets.month, month),
          eq(monthlyTargets.faultCategory, faultCategory),
        ),
      );
    if (existing.length > 0) {
      await db
        .update(monthlyTargets)
        .set({ maxCount, setBy: session.userId, setAt: new Date() })
        .where(
          and(
            eq(monthlyTargets.year, year),
            eq(monthlyTargets.month, month),
            eq(monthlyTargets.faultCategory, faultCategory),
          ),
        );
    } else {
      await db.insert(monthlyTargets).values({
        year,
        month,
        faultCategory,
        maxCount,
        setBy: session.userId,
      });
    }
  }

  revalidatePath("/admin/ziele");
  revalidatePath("/ausschlaege");
  return {};
}

export async function copyTargetsFromPreviousMonth(year: number, month: number) {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return { error: "Keine Berechtigung" };
  }
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prev = await db
    .select()
    .from(monthlyTargets)
    .where(and(eq(monthlyTargets.year, prevYear), eq(monthlyTargets.month, prevMonth)));

  for (const t of prev) {
    const existing = await db
      .select()
      .from(monthlyTargets)
      .where(
        and(
          eq(monthlyTargets.year, year),
          eq(monthlyTargets.month, month),
          eq(monthlyTargets.faultCategory, t.faultCategory),
        ),
      );
    if (existing.length === 0) {
      await db.insert(monthlyTargets).values({
        year,
        month,
        faultCategory: t.faultCategory,
        maxCount: t.maxCount,
        setBy: session.userId,
      });
    }
  }

  revalidatePath("/admin/ziele");
  return { count: prev.length };
}
