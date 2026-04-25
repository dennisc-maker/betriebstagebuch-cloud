import { createSupabaseServerClient } from "./supabase/server";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export type SessionPayload = {
  userId: number;
  username: string;
  fullName: string;
  role: "disponent" | "betriebsleiter" | "werkstatt" | "admin";
};

export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUser.id))
    .limit(1);

  if (!localUser || !localUser.isActive) return null;

  return {
    userId: localUser.id,
    username: localUser.username,
    fullName: localUser.fullName,
    role: localUser.role,
  };
}

export async function clearSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
