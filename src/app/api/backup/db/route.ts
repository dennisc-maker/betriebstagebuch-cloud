import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// In Cloud-Version: Postgres-DB-Dump nicht direkt downloadbar via App
// Stattdessen: Hinweis auf Supabase-Backup oder JSON-Export nutzen
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(
    JSON.stringify(
      {
        info: "DB-Datei-Download ist in der Cloud-Version nicht verfügbar.",
        alternatives: [
          "JSON-Export: GET /api/backup/incidents.json",
          "CSV-Export: GET /api/backup/incidents.csv",
          "Supabase Dashboard → Database → Backups (automatisch täglich, 7 Tage Retention im Pro-Plan)",
        ],
      },
      null,
      2,
    ),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
