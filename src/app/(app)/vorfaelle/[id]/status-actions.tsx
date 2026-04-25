"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateIncidentStatus } from "../../erfassung/actions";

export function StatusActions({
  id,
  status,
}: {
  id: number;
  status: "offen" | "in_bearbeitung" | "abgeschlossen";
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);
  const router = useRouter();

  const setStatus = (s: "offen" | "in_bearbeitung" | "abgeschlossen") => {
    if (pending) return;
    startTransition(async () => {
      await updateIncidentStatus(id, s);
      setCurrent(s);
      router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["offen", "in_bearbeitung", "abgeschlossen"] as const).map((s) => (
        <button
          key={s}
          onClick={() => setStatus(s)}
          disabled={pending || current === s}
          className="chip"
          data-on={current === s ? "true" : "false"}
        >
          {s === "offen" ? "Offen" : s === "in_bearbeitung" ? "In Bearbeitung" : "Abgeschlossen"}
        </button>
      ))}
    </div>
  );
}
