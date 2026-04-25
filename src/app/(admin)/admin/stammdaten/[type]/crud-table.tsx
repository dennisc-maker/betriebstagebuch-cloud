"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRecord, updateRecord, toggleActive } from "./actions";
import { Plus, Edit2, Save, X, Power } from "lucide-react";

type Field = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export function CrudTable({
  type,
  fields,
  rows,
}: {
  type: string;
  fields: Field[];
  rows: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startEdit = (row: Record<string, unknown>) => {
    setEditingId(Number(row.id));
    setDraft({ ...row });
    setError(null);
  };

  const startNew = () => {
    setEditingId("new");
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.key] = f.type === "checkbox" ? false : "";
    setDraft(initial);
    setError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft({});
    setError(null);
  };

  const save = () => {
    setError(null);
    const data: Record<string, unknown> = {};
    for (const f of fields) data[f.key] = draft[f.key] ?? null;

    startTransition(async () => {
      const res =
        editingId === "new"
          ? await createRecord(type, data)
          : await updateRecord(type, editingId as number, data);
      if (res.error) {
        setError(res.error);
      } else {
        cancel();
        router.refresh();
      }
    });
  };

  const onToggle = (id: number, current: boolean) => {
    startTransition(async () => {
      await toggleActive(type, id, !current);
      router.refresh();
    });
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline flex justify-between items-center">
        <span className="text-sm text-ink-muted">{rows.length} Einträge</span>
        <button onClick={startNew} disabled={pending || editingId !== null} className="btn-accent text-sm">
          <Plus size={16} />
          Neu anlegen
        </button>
      </div>
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 text-sm text-red-900">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th className="w-12">#</th>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th className="w-24">Aktiv</th>
              <th className="w-32">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {editingId === "new" && (
              <tr className="bg-accent-50/50">
                <td>—</td>
                {fields.map((f) => (
                  <td key={f.key}>
                    <FieldInput field={f} value={draft[f.key]} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                  </td>
                ))}
                <td>—</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={save} disabled={pending} className="btn-primary text-xs px-2 py-1">
                      <Save size={12} /> Speichern
                    </button>
                    <button onClick={cancel} className="btn-ghost text-xs px-2 py-1">
                      <X size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const id = Number(row.id);
              const isEditing = editingId === id;
              return (
                <tr key={id} className={isEditing ? "bg-brand-50/40" : ""}>
                  <td className="text-ink-subtle font-mono text-xs">{i + 1}</td>
                  {fields.map((f) => (
                    <td key={f.key}>
                      {isEditing ? (
                        <FieldInput field={f} value={draft[f.key]} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                      ) : (
                        renderCell(f, row[f.key])
                      )}
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => onToggle(id, Boolean(row.isActive))}
                      disabled={pending || isEditing}
                      className={
                        row.isActive
                          ? "pill bg-green-100 text-green-900 hover:bg-green-200"
                          : "pill bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }
                    >
                      <Power size={10} />
                      <span className="ml-1">{row.isActive ? "Aktiv" : "Inaktiv"}</span>
                    </button>
                  </td>
                  <td>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={save} disabled={pending} className="btn-primary text-xs px-2 py-1">
                          <Save size={12} />
                        </button>
                        <button onClick={cancel} className="btn-ghost text-xs px-2 py-1">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row)}
                        disabled={pending || editingId !== null}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        <Edit2 size={12} /> Bearbeiten
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderCell(f: Field, val: unknown) {
  if (f.type === "checkbox") {
    return val ? <span className="text-green-700">Ja</span> : <span className="text-ink-subtle">—</span>;
  }
  if (f.key === "faultCode" || f.key === "reasonCode" || f.key === "typeCode" || f.key === "vehicleNumber" || f.key === "lineNumber") {
    return <span className="font-mono text-xs bg-brand-50 px-1.5 py-0.5 rounded">{String(val ?? "—")}</span>;
  }
  if (f.key === "severity") {
    return (
      <span className={`pill ${val === "critical" ? "bg-red-100 text-red-900" : val === "major" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>
        {String(val ?? "—")}
      </span>
    );
  }
  return <span className="text-sm">{String(val ?? "—")}</span>;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <select
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        className="input text-sm py-1"
      >
        <option value="">— wählen —</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type === "email" ? "email" : "text"}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
      className="input text-sm py-1"
    />
  );
}
