"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Square, Trash2, Check } from "lucide-react";
import { bulkUpdateStatus, bulkDelete } from "./bulk-actions";

export function BulkBar({
  totalIds,
  canDelete,
}: {
  totalIds: number[];
  canDelete: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  // Listen to checkbox changes via custom event
  if (typeof window !== "undefined" && !(window as { __bulkInit?: boolean }).__bulkInit) {
    (window as { __bulkInit?: boolean }).__bulkInit = true;
    window.addEventListener("bulk:toggle", ((e: CustomEvent) => {
      const id = e.detail.id as number;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }) as EventListener);
    window.addEventListener("bulk:reset", (() => setSelected(new Set())) as EventListener);
  }

  const setStatus = (status: "offen" | "in_bearbeitung" | "abgeschlossen") => {
    if (selected.size === 0) return;
    startTransition(async () => {
      const res = await bulkUpdateStatus(Array.from(selected), status);
      if (!res.error) {
        setSelected(new Set());
        window.dispatchEvent(new CustomEvent("bulk:reset"));
        router.refresh();
      }
    });
  };

  const onDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    startTransition(async () => {
      await bulkDelete(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    });
  };

  const selectAll = () => {
    setSelected(new Set(totalIds));
    window.dispatchEvent(new CustomEvent("bulk:select-all", { detail: { ids: totalIds } }));
  };

  const clearAll = () => {
    setSelected(new Set());
    window.dispatchEvent(new CustomEvent("bulk:reset"));
  };

  if (selected.size === 0) {
    return (
      <div
        className="card card-pad"
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          fontSize: 12,
          color: "var(--ink-500)",
        }}
      >
        <Square size={14} />
        <span>Keine Auswahl · Klicken Sie auf die Checkbox links neben Vorfällen für Massenaktion</span>
        <div style={{ flex: 1 }} />
        <button onClick={selectAll} className="btn btn-sm btn-ghost">
          Alle auswählen
        </button>
      </div>
    );
  }

  return (
    <div
      className="card card-pad"
      style={{
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--accent-soft)",
        borderColor: "rgba(217, 119, 6, 0.25)",
        padding: "10px 16px",
        position: "sticky",
        top: 60,
        zIndex: 20,
      }}
    >
      <CheckSquare size={16} style={{ color: "var(--accent)" }} />
      <strong style={{ fontSize: 13 }}>{selected.size} ausgewählt</strong>
      <button onClick={clearAll} className="btn btn-sm btn-ghost">
        Auswahl aufheben
      </button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: "var(--ink-700)", marginRight: 6 }}>Status setzen:</span>
      {(["offen", "in_bearbeitung", "abgeschlossen"] as const).map((s) => (
        <button
          key={s}
          onClick={() => setStatus(s)}
          disabled={pending}
          className="btn btn-sm"
        >
          <Check size={12} />
          {s === "offen" ? "Offen" : s === "in_bearbeitung" ? "In Arbeit" : "Abgeschlossen"}
        </button>
      ))}
      {canDelete && (
        <button
          onClick={onDelete}
          disabled={pending}
          className="btn btn-sm"
          style={
            confirmDelete
              ? { background: "var(--sev-critical)", color: "#fff", borderColor: "var(--sev-critical)" }
              : undefined
          }
        >
          <Trash2 size={12} />
          {confirmDelete ? "Wirklich löschen?" : "Löschen"}
        </button>
      )}
    </div>
  );
}

export function BulkCheckbox({ id }: { id: number }) {
  const [checked, setChecked] = useState(false);

  if (typeof window !== "undefined" && !(window as { __bulkRowInit?: Set<number> }).__bulkRowInit?.has(id)) {
    if (!(window as { __bulkRowInit?: Set<number> }).__bulkRowInit) {
      (window as { __bulkRowInit?: Set<number> }).__bulkRowInit = new Set();
    }
    (window as { __bulkRowInit?: Set<number> }).__bulkRowInit!.add(id);
    window.addEventListener("bulk:reset", (() => setChecked(false)) as EventListener);
    window.addEventListener("bulk:select-all", (() => setChecked(true)) as EventListener);
  }

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChecked((c) => !c);
    window.dispatchEvent(new CustomEvent("bulk:toggle", { detail: { id } }));
  };

  return (
    <button
      onClick={toggle}
      className="icon-btn"
      style={{ width: 22, height: 22, flexShrink: 0 }}
      aria-label={checked ? "Auswahl entfernen" : "Vorfall auswählen"}
    >
      {checked ? (
        <CheckSquare size={16} style={{ color: "var(--accent)" }} />
      ) : (
        <Square size={16} style={{ color: "var(--ink-400)" }} />
      )}
    </button>
  );
}
