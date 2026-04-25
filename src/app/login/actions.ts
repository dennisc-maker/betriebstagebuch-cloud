"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyTotp } from "@/lib/totp";

export async function loginAction(data: {
  username: string;
  password: string;
  totpCode?: string;
}): Promise<{ error?: string; requireTotp?: boolean }> {
  const username = data.username.trim().toLowerCase();
  if (!username || !data.password) {
    return { error: "Benutzername und Passwort eingeben" };
  }

  const email = username.includes("@") ? username : `${username}@dispo.local`;

  const supabase = await createSupabaseServerClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password: data.password,
  });

  if (error || !authData.user) {
    return { error: "Benutzer nicht gefunden oder Passwort falsch" };
  }

  // 2FA-Check via local users table
  const [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, authData.user.id))
    .limit(1);

  if (localUser?.totpEnabled && localUser.totpSecret) {
    if (!data.totpCode) {
      // Logout supabase session - we need TOTP first
      await supabase.auth.signOut();
      return { requireTotp: true };
    }
    if (!verifyTotp(data.totpCode, localUser.totpSecret)) {
      await supabase.auth.signOut();
      return { error: "2FA-Code ungültig", requireTotp: true };
    }
  }

  revalidatePath("/", "layout");
  return {};
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
