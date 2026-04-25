"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { setReminder } from "./edit-actions";

export function ReminderSection({
  incidentId,
  reminderAt,
  reminderText,
}: {
  incidentId: number;
  reminderAt: string | null;
  reminderText: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(reminderAt ?? "");
  const [text, setText] = useState(reminderText ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const save = () => {
    startTransition(async () => {
      await setReminder(incidentId, date || null, text || null);
      setEditing(false);
      router.refresh();
    });
  };

  const clear = () => {
    startTransition(async () => {
      await setReminder(incidentId, null, null);
      setDate("");
      setText("");
      router.refresh();
    });
  };

  if (!reminderAt && !editing) {
    return (
      <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Bell size={16} style={{ color: "var(--ink-400)" }} />
        <span style={{ flex: 1, fontSize: 13, color: "var(--ink-600)" }}>
          Keine Erinnerung gesetzt
        </span>
        <button onClick={() => setEditing(true)} className="btn btn-sm">
          <Bell size={13} />
          Erinnerung setzen
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="card card-pad">
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Bell size={16} style={{ color: "var(--accent)" }} />
          <strong style={{ fontSize: 13 }}>Erinnerung / Wiedervorlage</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 8 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was soll passieren? z.B. Werkstatt-Status prüfen"
            className="input"
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={save} disabled={pending || !date} className="btn btn-primary btn-sm">
              Speichern
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-sm">
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reminder is set, not editing
  const reminderDate = new Date(reminderAt!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = reminderDate < today;
  const isToday = reminderDate.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);

  return (
    <div
      className="card card-pad"
      style={{
        background: isPast ? "var(--sev-critical-bg)" : isToday ? "var(--accent-soft)" : "var(--surface-2)",
        borderColor: isPast ? "rgba(220, 38, 38, 0.25)" : isToday ? "rgba(217, 119, 6, 0.25)" : undefined,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Bell
        size={18}
        style={{ color: isPast ? "var(--sev-critical)" : isToday ? "var(--accent)" : "var(--ink-600)" }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {isPast ? "Überfällig: " : isToday ? "Heute fällig: " : "Erinnerung: "}
          {reminderDate.toLocaleDateString("de-DE")}
        </div>
        {reminderText && <div style={{ fontSize: 12, color: "var(--ink-700)", marginTop: 2 }}>{reminderText}</div>}
      </div>
      <button onClick={() => setEditing(true)} className="btn btn-sm">
        Ändern
      </button>
      <button onClick={clear} disabled={pending} className="btn btn-sm" title="Erinnerung entfernen">
        <X size={13} />
      </button>
    </div>
  );
}
