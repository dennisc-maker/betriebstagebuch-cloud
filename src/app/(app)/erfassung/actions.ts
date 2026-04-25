"use server";

import { db } from "@/lib/db";
import { incidents, incidentAudit } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { shiftFromTime } from "@/lib/utils";

type IncidentInput = {
  incidentDate: string;
  incidentTime: string;
  dispatcherId?: number | null;
  vehicleId?: number | null;
  lineId?: number | null;
  circulationId?: number | null;
  tripId?: number | null;
  driverId?: number | null;
  faultId?: number | null;
  outageReasonId?: number | null;
  driverMessageTypeId?: number | null;
  measureText?: string | null;
  notes?: string | null;
  status?: "offen" | "in_bearbeitung" | "abgeschlossen";
};

export async function createIncidentAction(
  input: IncidentInput,
  goNext = false,
): Promise<{ id?: number; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  if (!input.incidentDate || !input.incidentTime) {
    return { error: "Datum und Uhrzeit sind Pflicht" };
  }

  try {
    const result = await db
      .insert(incidents)
      .values({
        incidentDate: input.incidentDate,
        incidentTime: input.incidentTime,
        shift: shiftFromTime(input.incidentTime),
        dispatcherId: input.dispatcherId ?? null,
        vehicleId: input.vehicleId ?? null,
        lineId: input.lineId ?? null,
        circulationId: input.circulationId ?? null,
        tripId: input.tripId ?? null,
        driverId: input.driverId ?? null,
        faultId: input.faultId ?? null,
        outageReasonId: input.outageReasonId ?? null,
        driverMessageTypeId: input.driverMessageTypeId ?? null,
        measureText: input.measureText ?? null,
        notes: input.notes ?? null,
        status: input.status ?? "offen",
        createdBy: session.userId,
      })
      .returning({ id: incidents.id });

    const newId = result[0]?.id;
    if (newId) {
      await db.insert(incidentAudit).values({
        incidentId: newId,
        userId: session.userId,
        action: "insert",
        newData: JSON.stringify(input),
      });
    }

    revalidatePath("/");
    revalidatePath("/tagesbericht");
    if (goNext) {
      revalidatePath("/erfassung");
    }
    return { id: newId };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateIncidentStatus(
  id: number,
  status: "offen" | "in_bearbeitung" | "abgeschlossen",
) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  const old = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  await db.update(incidents).set({ status }).where(eq(incidents.id, id));

  await db.insert(incidentAudit).values({
    incidentId: id,
    userId: session.userId,
    action: "update",
    oldData: JSON.stringify(old[0] ?? {}),
    newData: JSON.stringify({ status }),
  });

  revalidatePath("/");
  revalidatePath("/tagesbericht");
  return {};
}
