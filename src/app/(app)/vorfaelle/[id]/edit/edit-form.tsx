"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { updateIncident } from "../edit-actions";

type Incident = {
  id: number;
  faultId: number | null;
  vehicleId: number | null;
  lineId: number | null;
  driverId: number | null;
  outageReasonId: number | null;
  driverMessageTypeId: number | null;
  measureText: string | null;
  notes: string | null;
  status: "offen" | "in_bearbeitung" | "abgeschlossen";
};

type Fault = { id: number; faultCode: string; faultText: string; severity: string; category: string };

export function EditForm({
  incident,
  faults,
  vehicles,
  lines,
  drivers,
  outageReasons,
  measures,
  driverMessages,
}: {
  incident: Incident;
  faults: Fault[];
  vehicles: { id: number; vehicleNumber: string }[];
  lines: { id: number; lineNumber: string; name: string | null }[];
  drivers: { id: number; name: string }[];
  outageReasons: { id: number; reasonLabel: string }[];
  measures: { id: number; label: string }[];
  driverMessages: { id: number; label: string }[];
  dispatchers: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [faultId, setFaultId] = useState<number | null>(incident.faultId);
  const [vehicleId, setVehicleId] = useState<number | null>(incident.vehicleId);
  const [lineId, setLineId] = useState<number | null>(incident.lineId);
  const [driverId, setDriverId] = useState<number | null>(incident.driverId);
  const [outageReasonId, setOutageReasonId] = useState<number | null>(incident.outageReasonId);
  const [driverMessageTypeId, setDriverMessageTypeId] = useState<number | null>(incident.driverMessageTypeId);
  const [measureText, setMeasureText] = useState(incident.measureText ?? "");
  const [notes, setNotes] = useState(incident.notes ?? "");
  const [status, setStatus] = useState<"offen" | "in_bearbeitung" | "abgeschlossen">(incident.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateIncident(incident.id, {
        faultId,
        vehicleId,
        lineId,
        driverId,
        measureText: measureText.trim() || null,
        notes: notes.trim() || null,
        status,
      });
      if (res.error) setError(res.error);
      else router.push(`/vorfaelle/${incident.id}`);
    });
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head"><div className="card-title">Stammdaten</div></div>
        <div className="card-pad" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field">
            <label className="field-label">Fehler / Störung</label>
            <select className="select" value={faultId ?? ""} onChange={(e) => setFaultId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— kein Fehler —</option>
              {faults.map((f) => (<option key={f.id} value={f.id}>[{f.faultCode}] {f.faultText}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Fahrzeug</label>
            <select className="select" value={vehicleId ?? ""} onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— kein Fahrzeug —</option>
              {vehicles.map((v) => (<option key={v.id} value={v.id}>{v.vehicleNumber}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Linie</label>
            <select className="select" value={lineId ?? ""} onChange={(e) => setLineId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— keine Linie —</option>
              {lines.map((l) => (<option key={l.id} value={l.id}>Linie {l.lineNumber}{l.name ? ` · ${l.name}` : ""}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Fahrer</label>
            <select className="select" value={driverId ?? ""} onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— kein Fahrer —</option>
              {drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Linienausfall-Grund</label>
            <select className="select" value={outageReasonId ?? ""} onChange={(e) => setOutageReasonId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— kein Ausfall —</option>
              {outageReasons.map((o) => (<option key={o.id} value={o.id}>{o.reasonLabel}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Fahrer-Meldung</label>
            <select className="select" value={driverMessageTypeId ?? ""} onChange={(e) => setDriverMessageTypeId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— keine Meldung —</option>
              {driverMessages.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head"><div className="card-title">Maßnahme & Notizen</div></div>
        <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="field-label">Maßnahme</label>
            <textarea className="textarea" value={measureText} onChange={(e) => setMeasureText(e.target.value)} rows={3} maxLength={2000} />
          </div>
          <div className="field">
            <label className="field-label">Notizen</label>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["offen", "in_bearbeitung", "abgeschlossen"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="chip"
                  data-on={status === s ? "true" : "false"}
                >
                  {s === "offen" ? "Offen" : s === "in_bearbeitung" ? "In Bearbeitung" : "Abgeschlossen"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--sev-critical-bg)", color: "var(--sev-critical)", padding: "10px 12px", borderRadius: "var(--r-md)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => router.back()} className="btn">
          <X size={14} /> Abbrechen
        </button>
        <button type="submit" disabled={pending} className="btn btn-accent">
          <Save size={14} /> {pending ? "Speichern…" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
