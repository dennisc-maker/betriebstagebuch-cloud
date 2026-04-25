"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2 } from "lucide-react";
import { deleteIncident } from "./edit-actions";
import Link from "next/link";

export function EditDeleteActions({
  id,
  canEdit,
  canDelete,
}: {
  id: number;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  const onDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    startTransition(async () => {
      await deleteIncident(id);
      router.push("/vorfaelle");
    });
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {canEdit && (
        <Link href={`/vorfaelle/${id}/edit`} className="btn btn-sm">
          <Edit2 size={13} />
          Bearbeiten
        </Link>
      )}
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
          <Trash2 size={13} />
          {confirmDelete ? "Wirklich löschen?" : "Löschen"}
        </button>
      )}
    </div>
  );
}
