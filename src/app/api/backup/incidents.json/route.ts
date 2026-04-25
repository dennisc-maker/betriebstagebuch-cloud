import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const data = {
    exportedAt: new Date().toISOString(),
    schemaVersion: "1.0",
    dispatchers: await db.select().from(schema.dispatchers),
    workshopStaff: await db.select().from(schema.workshopStaff),
    drivers: await db.select().from(schema.drivers),
    vehicles: await db.select().from(schema.vehicles),
    busLines: await db.select().from(schema.busLines),
    circulations: await db.select().from(schema.circulations),
    trips: await db.select().from(schema.trips),
    faultCatalog: await db.select().from(schema.faultCatalog),
    outageReasons: await db.select().from(schema.outageReasons),
    measureTemplates: await db.select().from(schema.measureTemplates),
    driverMessageTypes: await db.select().from(schema.driverMessageTypes),
    notifiedParties: await db.select().from(schema.notifiedParties),
    monthlyTargets: await db.select().from(schema.monthlyTargets),
    incidents: await db.select().from(schema.incidents).where(isNull(schema.incidents.deletedAt)),
    incidentComments: await db.select().from(schema.incidentComments),
  };
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dispolog_export_${date}.json"`,
    },
  });
}
