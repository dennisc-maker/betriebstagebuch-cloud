import { db } from "@/lib/db";
import {
  incidents,
  faultCatalog,
  vehicles,
  busLines,
  drivers,
  outageReasons,
  measureTemplates,
  driverMessageTypes,
  dispatchers,
} from "@/lib/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditForm } from "./edit-form";

export default async function EditIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, id), isNull(incidents.deletedAt)))
    .limit(1);
  if (!incident) notFound();

  const [faultList, vehicleList, lineList, driverList, outageList, measureList, driverMsgList, dispatcherList] =
    await Promise.all([
      db.select({ id: faultCatalog.id, faultCode: faultCatalog.faultCode, faultText: faultCatalog.faultText, severity: faultCatalog.severity, category: faultCatalog.category }).from(faultCatalog).where(eq(faultCatalog.isActive, true)).orderBy(asc(faultCatalog.faultText)),
      db.select({ id: vehicles.id, vehicleNumber: vehicles.vehicleNumber }).from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.vehicleNumber)),
      db.select({ id: busLines.id, lineNumber: busLines.lineNumber, name: busLines.name }).from(busLines).where(eq(busLines.isActive, true)).orderBy(asc(busLines.lineNumber)),
      db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.isActive, true)).orderBy(asc(drivers.name)),
      db.select({ id: outageReasons.id, reasonLabel: outageReasons.reasonLabel }).from(outageReasons).where(eq(outageReasons.isActive, true)).orderBy(asc(outageReasons.reasonLabel)),
      db.select({ id: measureTemplates.id, label: measureTemplates.label }).from(measureTemplates).where(eq(measureTemplates.isActive, true)).orderBy(asc(measureTemplates.label)),
      db.select({ id: driverMessageTypes.id, label: driverMessageTypes.label }).from(driverMessageTypes).where(eq(driverMessageTypes.isActive, true)).orderBy(asc(driverMessageTypes.label)),
      db.select({ id: dispatchers.id, name: dispatchers.name }).from(dispatchers).where(eq(dispatchers.isActive, true)).orderBy(asc(dispatchers.name)),
    ]);

  return (
    <>
      <div className="page-head">
        <div>
          <Link
            href={`/vorfaelle/${id}`}
            style={{ display: "inline-flex", gap: 4, fontSize: 11.5, color: "var(--ink-500)", textDecoration: "none", marginBottom: 6 }}
          >
            <ChevronLeft size={12} />
            Zurück zum Vorfall
          </Link>
          <div className="page-eyebrow">Vorfall #{id} bearbeiten</div>
          <h1 className="page-title">Vorfall bearbeiten</h1>
        </div>
      </div>

      <EditForm
        incident={incident}
        faults={faultList}
        vehicles={vehicleList}
        lines={lineList}
        drivers={driverList}
        outageReasons={outageList}
        measures={measureList}
        driverMessages={driverMsgList}
        dispatchers={dispatcherList}
      />
    </>
  );
}
