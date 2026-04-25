"use server";

import { db } from "@/lib/db";
import { incidents, incidentAudit, incidentComments, incidentAttachments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateIncident(id: number, data: {
  faultId?: number | null;
  vehicleId?: number | null;
  lineId?: number | null;
  driverId?: number | null;
  measureText?: string | null;
  notes?: string | null;
  status?: "offen" | "in_bearbeitung" | "abgeschlossen";
}) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  const old = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!old[0]) return { error: "Vorfall nicht gefunden" };

  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) cleaned[k] = v === "" ? null : v;
  }
  cleaned.updatedAt = new Date().toISOString();

  await db.update(incidents).set(cleaned as never).where(eq(incidents.id, id));
  await db.insert(incidentAudit).values({
    incidentId: id,
    userId: session.userId,
    action: "update",
    oldData: JSON.stringify(old[0]),
    newData: JSON.stringify(cleaned),
  });

  revalidatePath(`/vorfaelle/${id}`);
  revalidatePath("/vorfaelle");
  revalidatePath("/tagesbericht");
  revalidatePath("/");
  return {};
}

export async function deleteIncident(id: number) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  await db
    .update(incidents)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(incidents.id, id));
  await db.insert(incidentAudit).values({
    incidentId: id,
    userId: session.userId,
    action: "delete",
  });
  revalidatePath("/vorfaelle");
  revalidatePath("/tagesbericht");
  revalidatePath("/");
  redirect("/vorfaelle");
}

export async function addComment(incidentId: number, body: string) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };
  if (!body.trim()) return { error: "Kommentar leer" };

  await db.insert(incidentComments).values({
    incidentId,
    userId: session.userId,
    body: body.trim(),
  });
  revalidatePath(`/vorfaelle/${incidentId}`);
  return {};
}

export async function deleteComment(commentId: number, incidentId: number) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };
  await db.delete(incidentComments).where(eq(incidentComments.id, commentId));
  revalidatePath(`/vorfaelle/${incidentId}`);
  return {};
}

export async function setReminder(incidentId: number, reminderAt: string | null, reminderText: string | null) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  await db
    .update(incidents)
    .set({ reminderAt: reminderAt || null, reminderText: reminderText || null })
    .where(eq(incidents.id, incidentId));

  revalidatePath(`/vorfaelle/${incidentId}`);
  revalidatePath("/");
  return {};
}

const STORAGE_BUCKET = "incident-attachments";

export async function uploadAttachment(incidentId: number, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt" };
  if (file.size > 10 * 1024 * 1024) return { error: "Datei zu groß (max 10 MB)" };

  const allowed = ["image/", "application/pdf"];
  if (!allowed.some((a) => file.type.startsWith(a))) {
    return { error: "Nur Bilder und PDFs erlaubt" };
  }

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const ts = Date.now();
  const storagePath = `${incidentId}/${ts}_${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadErr) {
    return { error: `Upload fehlgeschlagen: ${uploadErr.message}` };
  }

  await db.insert(incidentAttachments).values({
    incidentId,
    userId: session.userId,
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
  });

  revalidatePath(`/vorfaelle/${incidentId}`);
  return {};
}

export async function deleteAttachment(attachmentId: number, incidentId: number) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };
  const [a] = await db.select().from(incidentAttachments).where(eq(incidentAttachments.id, attachmentId)).limit(1);
  if (a) {
    try {
      const { createSupabaseServerClient } = await import("@/lib/supabase/server");
      const supabase = await createSupabaseServerClient();
      await supabase.storage.from(STORAGE_BUCKET).remove([a.storagePath]);
    } catch {}
  }
  await db.delete(incidentAttachments).where(eq(incidentAttachments.id, attachmentId));
  revalidatePath(`/vorfaelle/${incidentId}`);
  return {};
}

export async function getAttachmentUrl(storagePath: string) {
  const session = await getSession();
  if (!session) return null;
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}
