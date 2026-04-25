"use server";

import { db } from "@/lib/db";
import { incidents, incidentAudit } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function bulkUpdateStatus(
  ids: number[],
  status: "offen" | "in_bearbeitung" | "abgeschlossen",
) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };
  if (ids.length === 0) return { error: "Keine Auswahl" };

  await db
    .update(incidents)
    .set({ status, updatedAt: new Date() })
    .where(inArray(incidents.id, ids));

  for (const id of ids) {
    await db.insert(incidentAudit).values({
      incidentId: id,
      userId: session.userId,
      action: "update",
      newData: JSON.stringify({ status }),
    });
  }

  revalidatePath("/vorfaelle");
  revalidatePath("/tagesbericht");
  revalidatePath("/");
  return { count: ids.length };
}

export async function bulkDelete(ids: number[]) {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return { error: "Keine Berechtigung" };
  }
  if (ids.length === 0) return { error: "Keine Auswahl" };

  await db.update(incidents).set({ deletedAt: new Date() }).where(inArray(incidents.id, ids));

  for (const id of ids) {
    await db.insert(incidentAudit).values({
      incidentId: id,
      userId: session.userId,
      action: "delete",
    });
  }

  revalidatePath("/vorfaelle");
  return { count: ids.length };
}
