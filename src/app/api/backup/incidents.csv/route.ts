import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  incidents,
  faultCatalog,
  vehicles,
  busLines,
  dispatchers,
  drivers,
  outageReasons,
} from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const rows = await db
    .select({
      id: incidents.id,
      date: incidents.incidentDate,
      time: incidents.incidentTime,
      shift: incidents.shift,
      status: incidents.status,
      faultCode: faultCatalog.faultCode,
      faultText: faultCatalog.faultText,
      severity: faultCatalog.severity,
      category: faultCatalog.category,
      vehicle: vehicles.vehicleNumber,
      line: busLines.lineNumber,
      lineName: busLines.name,
      dispatcher: dispatchers.name,
      driver: drivers.name,
      outageReason: outageReasons.reasonLabel,
      measureText: incidents.measureText,
      notes: incidents.notes,
      createdAt: incidents.createdAt,
    })
    .from(incidents)
    .leftJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .leftJoin(dispatchers, eq(incidents.dispatcherId, dispatchers.id))
    .leftJoin(drivers, eq(incidents.driverId, drivers.id))
    .leftJoin(outageReasons, eq(incidents.outageReasonId, outageReasons.id))
    .where(isNull(incidents.deletedAt))
    .orderBy(desc(incidents.incidentDate), desc(incidents.incidentTime));

  const headers = [
    "ID",
    "Datum",
    "Zeit",
    "Schicht",
    "Status",
    "Fehler-Code",
    "Fehler-Text",
    "Schwere",
    "Kategorie",
    "Fahrzeug",
    "Linie",
    "Linien-Name",
    "Disponent",
    "Fahrer",
    "Ausfall-Grund",
    "Maßnahme",
    "Notizen",
    "Erstellt",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.date,
        r.time,
        r.shift,
        r.status,
        r.faultCode,
        r.faultText,
        r.severity,
        r.category,
        r.vehicle,
        r.line,
        r.lineName,
        r.dispatcher,
        r.driver,
        r.outageReason,
        r.measureText,
        r.notes,
        r.createdAt,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  const bom = "\uFEFF";
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(bom + lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dispolog_incidents_${date}.csv"`,
    },
  });
}
