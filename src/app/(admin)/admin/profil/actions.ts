"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { revalidatePath } from "next/cache";

export async function enableTotp(secret: string, code: string) {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  if (!verifyTotp(code, secret)) {
    return { error: "Code ungültig. Bitte aus der Authenticator-App neu eingeben." };
  }

  await db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: true })
    .where(eq(users.id, session.userId));

  revalidatePath("/admin/profil");
  return {};
}

export async function disableTotp() {
  const session = await getSession();
  if (!session) return { error: "Nicht angemeldet" };

  await db
    .update(users)
    .set({ totpSecret: null, totpEnabled: false })
    .where(eq(users.id, session.userId));

  revalidatePath("/admin/profil");
  return {};
}
