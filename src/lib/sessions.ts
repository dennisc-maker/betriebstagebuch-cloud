import { db } from "./db";
import { userSessions, users } from "./db/schema";
import { eq, gt, and } from "drizzle-orm";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 Min

export async function touchSession(userId: number, ip?: string, ua?: string) {
  const [existing] = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(userSessions)
      .set({ lastSeen: new Date() })
      .where(eq(userSessions.id, existing.id));
  } else {
    await db.insert(userSessions).values({
      userId,
      ipAddress: ip ?? null,
      userAgent: ua?.slice(0, 200) ?? null,
    });
  }
}

export async function getActiveUsers() {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
  return db
    .select({
      userId: userSessions.userId,
      fullName: users.fullName,
      role: users.role,
      lastSeen: userSessions.lastSeen,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(gt(userSessions.lastSeen, cutoff));
}
