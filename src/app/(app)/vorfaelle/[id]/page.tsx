import { db } from "@/lib/db";
import {
  incidents,
  faultCatalog,
  vehicles,
  busLines,
  dispatchers,
  drivers,
  outageReasons,
  driverMessageTypes,
  trips,
  circulations,
  workshopStaff,
  incidentAudit,
  incidentComments,
  incidentAttachments,
  users,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, History, MessageSquare, Paperclip, Bell as BellIcon } from "lucide-react";
import { formatDateShort, SHIFT_LABEL } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { CommentSection } from "./comment-section";
import { AttachmentSection } from "./attachment-section";
import { ReminderSection } from "./reminder-section";
import { EditDeleteActions } from "./edit-delete-actions";
import { getSession } from "@/lib/auth";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: incidents.id,
      date: incidents.incidentDate,
      time: incidents.incidentTime,
      shift: incidents.shift,
      status: incidents.status,
      faultId: incidents.faultId,
      faultText: faultCatalog.faultText,
      faultCode: faultCatalog.faultCode,
      severity: faultCatalog.severity,
      category: faultCatalog.category,
      vehicleId: incidents.vehicleId,
      vehicle: vehicles.vehicleNumber,
      vehicleType: vehicles.vehicleType,
      lineId: incidents.lineId,
      line: busLines.lineNumber,
      lineName: busLines.name,
      driverId: incidents.driverId,
      dispatcher: dispatchers.name,
      driver: drivers.name,
      workshopStaff: workshopStaff.name,
      outageReason: outageReasons.reasonLabel,
      driverMessage: driverMessageTypes.label,
      tripNumber: trips.tripNumber,
      circulationNumber: circulations.circulationNumber,
      measureText: incidents.measureText,
      notes: incidents.notes,
      reminderAt: incidents.reminderAt,
      reminderText: incidents.reminderText,
      createdAt: incidents.createdAt,
      updatedAt: incidents.updatedAt,
    })
    .from(incidents)
    .leftJoin(faultCatalog, eq(incidents.faultId, faultCatalog.id))
    .leftJoin(vehicles, eq(incidents.vehicleId, vehicles.id))
    .leftJoin(busLines, eq(incidents.lineId, busLines.id))
    .leftJoin(dispatchers, eq(incidents.dispatcherId, dispatchers.id))
    .leftJoin(drivers, eq(incidents.driverId, drivers.id))
    .leftJoin(workshopStaff, eq(incidents.workshopStaffId, workshopStaff.id))
    .leftJoin(outageReasons, eq(incidents.outageReasonId, outageReasons.id))
    .leftJoin(driverMessageTypes, eq(incidents.driverMessageTypeId, driverMessageTypes.id))
    .leftJoin(trips, eq(incidents.tripId, trips.id))
    .leftJoin(circulations, eq(incidents.circulationId, circulations.id))
    .where(and(eq(incidents.id, id), isNull(incidents.deletedAt)))
    .limit(1);

  if (!row) notFound();

  const auditRows = await db
    .select({
      id: incidentAudit.id,
      action: incidentAudit.action,
      changedAt: incidentAudit.changedAt,
      userName: users.fullName,
    })
    .from(incidentAudit)
    .leftJoin(users, eq(incidentAudit.userId, users.id))
    .where(eq(incidentAudit.incidentId, id))
    .orderBy(desc(incidentAudit.changedAt))
    .limit(20);

  const comments = await db
    .select({
      id: incidentComments.id,
      body: incidentComments.body,
      createdAt: incidentComments.createdAt,
      userId: incidentComments.userId,
      userName: users.fullName,
      userRole: users.role,
    })
    .from(incidentComments)
    .leftJoin(users, eq(incidentComments.userId, users.id))
    .where(eq(incidentComments.incidentId, id))
    .orderBy(asc(incidentComments.createdAt));

  const attachments = await db
    .select({
      id: incidentAttachments.id,
      filename: incidentAttachments.filename,
      mimeType: incidentAttachments.mimeType,
      fileSize: incidentAttachments.fileSize,
      storagePath: incidentAttachments.storagePath,
      createdAt: incidentAttachments.createdAt,
      userName: users.fullName,
    })
    .from(incidentAttachments)
    .leftJoin(users, eq(incidentAttachments.userId, users.id))
    .where(eq(incidentAttachments.incidentId, id))
    .orderBy(desc(incidentAttachments.createdAt));

  const canEdit = session?.role !== "werkstatt";
  const canDelete = session?.role === "betriebsleiter" || session?.role === "admin";

  return (
    <>
      <div className="page-head">
        <div>
          <Link
            href="/vorfaelle"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11.5,
              color: "var(--ink-500)",
              textDecoration: "none",
              marginBottom: 6,
            }}
          >
            <ChevronLeft size={12} />
            Vorfälle
          </Link>
          <div className="page-eyebrow">Vorfall #{row.id}</div>
          <h1 className="page-title">
            <span className="sev-dot" data-sev={row.severity ?? "minor"} style={{ marginRight: 8, width: 12, height: 12 }} />
            {row.faultText ?? row.outageReason ?? row.driverMessage ?? "Vorfall ohne Code"}
          </h1>
          <p className="page-sub">
            {formatDateShort(row.date)} · {row.time} · {SHIFT_LABEL[row.shift as "frueh"]}
          </p>
        </div>
        <div className="page-actions" style={{ flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <StatusActions id={row.id} status={row.status} />
          {(canEdit || canDelete) && (
            <EditDeleteActions id={row.id} canEdit={canEdit} canDelete={canDelete} />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Details */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Vorfall-Details</div>
            </div>
            <div className="card-pad" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DetailField label="Fehler-Code">
                {row.faultCode ? (
                  <span className="code" style={{ background: "var(--brand-50)", padding: "2px 8px", borderRadius: 4 }}>
                    {row.faultCode}
                  </span>
                ) : (
                  <span style={{ color: "var(--ink-400)" }}>—</span>
                )}
              </DetailField>
              <DetailField label="Kategorie">
                {row.category ? (
                  <span className="pill pill-neutral" style={{ textTransform: "capitalize" }}>{row.category}</span>
                ) : "—"}
              </DetailField>
              <DetailField label="Schwere">
                {row.severity ? (
                  <span
                    className={
                      "pill " +
                      (row.severity === "critical" ? "pill-critical" : row.severity === "major" ? "pill-warning" : "pill-neutral")
                    }
                  >
                    {row.severity}
                  </span>
                ) : "—"}
              </DetailField>
              <DetailField label="Status">
                <span
                  className={
                    "pill " +
                    (row.status === "abgeschlossen" ? "pill-ok" : row.status === "in_bearbeitung" ? "pill-info" : "pill-warning")
                  }
                >
                  {row.status === "abgeschlossen" ? "Abgeschlossen" : row.status === "in_bearbeitung" ? "In Arbeit" : "Offen"}
                </span>
              </DetailField>
              <DetailField label="Fahrzeug">
                {row.vehicle ? <strong>{row.vehicle}</strong> : "—"}
                {row.vehicleType && <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{row.vehicleType}</div>}
              </DetailField>
              <DetailField label="Linie / Fahrt">
                {row.line ? (
                  <span>
                    <span className="code" style={{ background: "var(--brand-50)", padding: "1px 6px", borderRadius: 4 }}>
                      {row.line}
                    </span>
                    {row.lineName && <span style={{ marginLeft: 6, fontSize: 12, color: "var(--ink-600)" }}>{row.lineName}</span>}
                  </span>
                ) : "—"}
                {row.tripNumber && <div className="code" style={{ fontSize: 11, marginTop: 2 }}>Fahrt: {row.tripNumber}</div>}
                {row.circulationNumber && <div className="code" style={{ fontSize: 11 }}>Umlauf: {row.circulationNumber}</div>}
              </DetailField>
              <DetailField label="Disponent">{row.dispatcher ?? "—"}</DetailField>
              <DetailField label="Fahrer">{row.driver ?? "—"}</DetailField>
              {row.outageReason && (
                <DetailField label="Linienausfall-Grund" full>
                  <span style={{ color: "var(--sev-warning)" }}>{row.outageReason}</span>
                </DetailField>
              )}
              {row.driverMessage && <DetailField label="Fahrer-Meldung" full>{row.driverMessage}</DetailField>}
              {row.workshopStaff && <DetailField label="Werkstatt">{row.workshopStaff}</DetailField>}
              {row.measureText && (
                <DetailField label="Maßnahme der Disposition" full>
                  <div style={{ whiteSpace: "pre-wrap" }}>{row.measureText}</div>
                </DetailField>
              )}
              {row.notes && (
                <DetailField label="Notizen" full>
                  <div style={{ whiteSpace: "pre-wrap", color: "var(--ink-700)" }}>{row.notes}</div>
                </DetailField>
              )}
            </div>
          </div>

          {/* Reminder */}
          <ReminderSection
            incidentId={row.id}
            reminderAt={row.reminderAt}
            reminderText={row.reminderText}
          />

          {/* Comments */}
          <CommentSection
            incidentId={row.id}
            comments={comments}
            currentUserId={session?.userId ?? 0}
          />

          {/* Attachments */}
          <AttachmentSection
            incidentId={row.id}
            attachments={attachments}
          />
        </div>

        {/* Audit Log */}
        <div className="card" style={{ alignSelf: "start", position: "sticky", top: 80 }}>
          <div className="card-head">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <History size={16} style={{ color: "var(--ink-500)" }} />
              Verlauf
            </div>
            <div className="card-sub">{auditRows.length} Einträge</div>
          </div>
          <div>
            {auditRows.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-500)", fontSize: 12 }}>
                Keine Änderungen protokolliert
              </div>
            )}
            {auditRows.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--hair-soft)",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span
                    className={
                      "pill " +
                      (a.action === "insert"
                        ? "pill-ok"
                        : a.action === "update"
                          ? "pill-info"
                          : "pill-warning")
                    }
                    style={{ fontSize: 9.5 }}
                  >
                    {a.action === "insert" ? "Erstellt" : a.action === "update" ? "Geändert" : "Gelöscht"}
                  </span>
                  <span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{a.userName ?? "System"}</span>
                </div>
                <div className="code" style={{ fontSize: 10.5, color: "var(--ink-500)" }}>
                  {new Date(a.changedAt).toLocaleString("de-DE")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div className="metric-label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{children}</div>
    </div>
  );
}
