import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL ist nicht gesetzt. Bitte .env.local konfigurieren.");
}

const globalForPg = globalThis as unknown as { _pgClient?: ReturnType<typeof postgres> };
const client = globalForPg._pgClient ?? postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
if (process.env.NODE_ENV !== "production") globalForPg._pgClient = client;

export const db = drizzle(client, { schema });
export { client };
