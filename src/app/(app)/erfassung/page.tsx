import { db } from "@/lib/db";
import {
  faultCatalog,
  vehicles,
  busLines,
  drivers,
  outageReasons,
  measureTemplates,
  driverMessageTypes,
  dispatchers,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { IncidentForm } from "./incident-form";

export default async function ErfassungPage() {
  const session = await getSession();
  if (!session) return null;

  const [
    faultList,
    vehicleList,
    lineList,
    driverList,
    outageList,
    measureList,
    driverMsgList,
    dispatcherList,
  ] = await Promise.all([
    db.select({
      id: faultCatalog.id,
      faultCode: faultCatalog.faultCode,
      faultText: faultCatalog.faultText,
      category: faultCatalog.category,
      severity: faultCatalog.severity,
    }).from(faultCatalog).where(eq(faultCatalog.isActive, true)).orderBy(asc(faultCatalog.faultText)),
    db.select({ id: vehicles.id, vehicleNumber: vehicles.vehicleNumber }).from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.vehicleNumber)),
    db.select({ id: busLines.id, lineNumber: busLines.lineNumber, name: busLines.name }).from(busLines).where(eq(busLines.isActive, true)).orderBy(asc(busLines.lineNumber)),
    db.select({ id: drivers.id, name: drivers.name }).from(drivers).where(eq(drivers.isActive, true)).orderBy(asc(drivers.name)),
    db.select({ id: outageReasons.id, reasonLabel: outageReasons.reasonLabel }).from(outageReasons).where(eq(outageReasons.isActive, true)).orderBy(asc(outageReasons.reasonLabel)),
    db.select({ id: measureTemplates.id, label: measureTemplates.label, isQuickPick: measureTemplates.isQuickPick }).from(measureTemplates).where(eq(measureTemplates.isActive, true)).orderBy(asc(measureTemplates.label)),
    db.select({ id: driverMessageTypes.id, label: driverMessageTypes.label }).from(driverMessageTypes).where(eq(driverMessageTypes.isActive, true)).orderBy(asc(driverMessageTypes.label)),
    db.select({ id: dispatchers.id, name: dispatchers.name }).from(dispatchers).where(eq(dispatchers.isActive, true)).orderBy(asc(dispatchers.name)),
  ]);

  // Default-Disponent: aus Login-Name finden
  const myDispatcher = dispatcherList.find((d) =>
    session.fullName.toLowerCase().includes(d.name.split(" ")[0]?.toLowerCase() ?? ""),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Erfassen</div>
          <h1 className="page-title">Neuer Vorfall</h1>
          <p className="page-sub">
            Strukturiert erfassen · in unter 30 Sekunden für Power-Nutzer
          </p>
        </div>
      </div>

      <IncidentForm
        session={session}
        faults={faultList}
        vehicles={vehicleList}
        lines={lineList}
        drivers={driverList}
        outageReasons={outageList}
        measures={measureList}
        driverMessages={driverMsgList}
        dispatchers={dispatcherList}
        defaultDispatcherId={myDispatcher?.id ?? null}
      />
    </>
  );
}
