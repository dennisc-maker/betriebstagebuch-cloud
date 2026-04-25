"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createIncidentAction } from "./actions";
import type { SessionPayload } from "@/lib/auth";
import { SHIFT_LABEL, shiftFromTime, todayIso, nowTime } from "@/lib/utils";
import { Save, Search, ChevronRight, X } from "lucide-react";

type Fault = { id: number; faultCode: string; faultText: string; category: string; severity: string };
type LineOpt = { id: number; lineNumber: string; name: string | null };

export function IncidentForm({
  session,
  faults,
  vehicles,
  lines,
  drivers,
  outageReasons,
  measures,
  driverMessages,
  dispatchers,
  defaultDispatcherId,
}: {
  session: SessionPayload;
  faults: Fault[];
  vehicles: { id: number; vehicleNumber: string }[];
  lines: LineOpt[];
  drivers: { id: number; name: string }[];
  outageReasons: { id: number; reasonLabel: string }[];
  measures: { id: number; label: string; isQuickPick: boolean }[];
  driverMessages: { id: number; label: string }[];
  dispatchers: { id: number; name: string }[];
  defaultDispatcherId: number | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState(nowTime());
  const [dispatcherId, setDispatcherId] = useState<number | null>(defaultDispatcherId);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [lineId, setLineId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [faultQuery, setFaultQuery] = useState("");
  const [faultId, setFaultId] = useState<number | null>(null);
  const [showFaultDropdown, setShowFaultDropdown] = useState(false);
  const [outageReasonId, setOutageReasonId] = useState<number | null>(null);
  const [driverMessageTypeId, setDriverMessageTypeId] = useState<number | null>(null);
  const [selectedMeasures, setSelectedMeasures] = useState<number[]>([]);
  const [measureText, setMeasureText] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"offen" | "in_bearbeitung" | "abgeschlossen">("offen");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const faultInputRef = useRef<HTMLInputElement>(null);

  const shift = shiftFromTime(time);

  const filteredFaults = useMemo(() => {
    const q = faultQuery.trim().toLowerCase();
    if (!q) return faults.slice(0, 50);
    return faults
      .filter(
        (f) => f.faultText.toLowerCase().includes(q) || f.faultCode.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [faultQuery, faults]);

  const selectedFault = faults.find((f) => f.id === faultId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        submitForm(true);
      }
      if (e.key === "Escape") {
        setShowFaultDropdown(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const submitForm = async (goNext: boolean) => {
    if (pending) return; // Debounce: ignore rapid clicks
    setPending(true);
    setError(null);
    const result = await createIncidentAction(
      {
        incidentDate: date,
        incidentTime: time,
        dispatcherId,
        vehicleId,
        lineId,
        driverId,
        faultId,
        outageReasonId,
        driverMessageTypeId,
        measureText:
          measureText.trim() ||
          (selectedMeasures.length
            ? measures
                .filter((m) => selectedMeasures.includes(m.id))
                .map((m) => m.label)
                .join(" · ")
            : null),
        notes: notes.trim() || null,
        status,
      },
      goNext,
    );
    setPending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(`Vorfall #${result.id} gespeichert`);
      if (goNext) {
        setTime(nowTime());
        setFaultQuery("");
        setFaultId(null);
        setDriverId(null);
        setOutageReasonId(null);
        setDriverMessageTypeId(null);
        setSelectedMeasures([]);
        setMeasureText("");
        setNotes("");
        setStatus("offen");
        setTimeout(() => setSuccess(null), 2500);
        setTimeout(() => faultInputRef.current?.focus(), 50);
      } else {
        setTimeout(() => router.push("/"), 800);
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitForm(false);
      }}
      style={{ maxWidth: 760, margin: "0 auto" }}
    >
      {/* Section: Wann */}
      <Section title="Wann" eyebrow="Datum & Uhrzeit · Schicht wird automatisch gesetzt">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label">Datum</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">
              <span>Uhrzeit</span>
              <button
                type="button"
                onClick={() => setTime(nowTime())}
                style={{
                  background: "none",
                  border: 0,
                  fontSize: 11,
                  color: "var(--ink-500)",
                  fontWeight: 400,
                  cursor: "pointer",
                }}
              >
                Jetzt
              </button>
            </label>
            <input
              type="time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {[5, 15, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() - m);
                    setTime(
                      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
                    );
                  }}
                  className="chip"
                  style={{ fontSize: 11, padding: "2px 7px" }}
                >
                  −{m} Min
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Schicht</label>
            <div style={{ display: "flex", gap: 6, marginTop: 1 }}>
              {(["frueh", "mittel", "spaet"] as const).map((s) => (
                <span
                  key={s}
                  className={`pill pill-${s}`}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "8px",
                    opacity: shift === s ? 1 : 0.35,
                    fontSize: 12,
                  }}
                >
                  {SHIFT_LABEL[s].replace("schicht", "")}
                </span>
              ))}
            </div>
            <div className="field-hint" style={{ marginTop: 4 }}>
              Auto: {SHIFT_LABEL[shift]}
            </div>
          </div>
        </div>
      </Section>

      {/* Section: Was */}
      <Section title="Was" eyebrow="Fehler-Code aus Fehlerkatalog (Pflicht für Auswertung)">
        <div className="field" style={{ position: "relative" }}>
          <label className="field-label">Fehler / Störung</label>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-400)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={faultInputRef}
              type="text"
              className="input"
              style={{ paddingLeft: 32, paddingRight: selectedFault ? 32 : 12 }}
              placeholder="z.B. AdBlue, Akku, Unfall, Linienausfall…"
              value={
                selectedFault ? `[${selectedFault.faultCode}] ${selectedFault.faultText}` : faultQuery
              }
              onChange={(e) => {
                setFaultId(null);
                setFaultQuery(e.target.value);
                setShowFaultDropdown(true);
              }}
              onFocus={() => setShowFaultDropdown(true)}
              onBlur={() => setTimeout(() => setShowFaultDropdown(false), 200)}
            />
            {selectedFault && (
              <button
                type="button"
                onClick={() => {
                  setFaultId(null);
                  setFaultQuery("");
                }}
                className="icon-btn"
                style={{
                  position: "absolute",
                  right: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 22,
                  height: 22,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {showFaultDropdown && filteredFaults.length > 0 && (
            <div
              style={{
                position: "absolute",
                zIndex: 10,
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                maxHeight: 320,
                overflowY: "auto",
                background: "var(--surface)",
                border: "1px solid var(--hair-strong)",
                borderRadius: "var(--r-md)",
                boxShadow: "var(--shadow-pop)",
              }}
            >
              {filteredFaults.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFaultId(f.id);
                    setFaultQuery("");
                    setShowFaultDropdown(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 12px",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    borderBottom: "1px solid var(--hair-soft)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                  className="fault-option"
                >
                  <span className="sev-dot" data-sev={f.severity} style={{ marginTop: 5 }} />
                  <span className="code" style={{ minWidth: 56, color: "var(--ink-600)", paddingTop: 2 }}>
                    {f.faultCode}
                  </span>
                  <span style={{ flex: 1 }}>{f.faultText}</span>
                  <span className="pill pill-neutral" style={{ fontSize: 10, textTransform: "capitalize" }}>
                    {f.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedFault && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "var(--brand-50)",
              borderRadius: "var(--r-md)",
              fontSize: 12,
              color: "var(--brand-900)",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span className="sev-dot" data-sev={selectedFault.severity} />
            <span>
              Schwere: <strong style={{ textTransform: "capitalize" }}>{selectedFault.severity}</strong>
              {" · "}
              Kategorie: <strong style={{ textTransform: "capitalize" }}>{selectedFault.category}</strong>
            </span>
          </div>
        )}
      </Section>

      {/* Section: Fahrzeug & Linie */}
      <Section title="Fahrzeug & Linie" eyebrow="Welcher Bus auf welcher Linie">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label">Fahrzeug</label>
            <select
              className="select"
              value={vehicleId ?? ""}
              onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— kein Fahrzeug —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Linie</label>
            <select
              className="select"
              value={lineId ?? ""}
              onChange={(e) => setLineId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— keine Linie —</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  Linie {l.lineNumber}
                  {l.name ? ` · ${l.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Section: Fahrer */}
      <Section title="Fahrer" eyebrow="Optional · Falls ein Fahrer betroffen ist">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label">Fahrer</label>
            <select
              className="select"
              value={driverId ?? ""}
              onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— kein Fahrer —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Fahrer-Meldung</label>
            <select
              className="select"
              value={driverMessageTypeId ?? ""}
              onChange={(e) =>
                setDriverMessageTypeId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— keine Meldung —</option>
              {driverMessages.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field-label">Linienausfall-Grund</label>
          <select
            className="select"
            value={outageReasonId ?? ""}
            onChange={(e) => setOutageReasonId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— kein Ausfall —</option>
            {outageReasons.map((o) => (
              <option key={o.id} value={o.id}>
                {o.reasonLabel}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* Section: Maßnahmen */}
      <Section
        title="Maßnahmen"
        eyebrow={`${measures.length} Vorlagen · Mehrfach-Auswahl möglich`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {measures.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() =>
                setSelectedMeasures((prev) =>
                  prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                )
              }
              className="chip"
              data-on={selectedMeasures.includes(m.id) ? "true" : "false"}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label className="field-label">
            <span>Freitext</span>
            <span className="field-hint">Ergänzt die ausgewählten Vorlagen</span>
          </label>
          <textarea
            className="textarea"
            placeholder="Freitext-Maßnahme oder zusätzliche Erläuterung…"
            value={measureText}
            onChange={(e) => setMeasureText(e.target.value)}
            rows={3}
          />
        </div>
      </Section>

      {/* Section: Notiz & Status */}
      <Section title="Notiz & Status">
        <div className="field">
          <label className="field-label">Notizen</label>
          <textarea
            className="textarea"
            placeholder="Zusätzliche Bemerkungen…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field-label">Status</label>
          <div style={{ display: "flex", gap: 8 }}>
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
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field-label">Disposition</label>
          <select
            className="select"
            value={dispatcherId ?? ""}
            onChange={(e) => setDispatcherId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— wählen —</option>
            {dispatchers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="field-hint" style={{ marginTop: 4 }}>
            Angemeldet als <strong>{session.fullName}</strong>
          </div>
        </div>
      </Section>

      {error && (
        <div
          style={{
            background: "var(--sev-critical-bg)",
            color: "var(--sev-critical)",
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: "var(--sev-ok-bg)",
            color: "var(--sev-ok)",
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {success}
        </div>
      )}

      {/* Sticky action footer */}
      <div
        style={{
          position: "sticky",
          bottom: 16,
          display: "flex",
          gap: 8,
          padding: 12,
          background: "var(--surface)",
          border: "1px solid var(--hair)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-pop)",
          marginTop: 16,
        }}
      >
        <button type="button" onClick={() => router.back()} className="btn btn-ghost">
          Abbrechen
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => submitForm(true)}
          disabled={pending}
          className="btn"
        >
          <ChevronRight size={14} />
          Speichern + nächster
        </button>
        <button type="submit" disabled={pending} className="btn btn-accent">
          <Save size={14} />
          {pending ? "Speichern…" : "Vorfall speichern"}
        </button>
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: 8,
          fontSize: 11.5,
          color: "var(--ink-500)",
        }}
      >
        Hotkey: <span className="kbd">Strg+Enter</span> = Speichern + nächster ·{" "}
        <span className="kbd">Esc</span> = Abbrechen
      </div>
    </form>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {eyebrow && <div className="card-sub">{eyebrow}</div>}
        </div>
      </div>
      <div className="card-pad">{children}</div>
    </div>
  );
}
