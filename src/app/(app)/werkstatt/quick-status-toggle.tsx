"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateIncidentStatus } from "../erfassung/actions";

export function QuickStatusToggle({
  id,
  status,
}: {
  id: number;
  status: "offen" | "in_bearbeitung" | "abgeschlossen";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const setStatus = (s: "offen" | "in_bearbeitung" | "abgeschlossen") => {
    startTransition(async () => {
      await updateIncidentStatus(id, s);
      router.refresh();
    });
  };

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {(["offen", "in_bearbeitung", "abgeschlossen"] as const).map((s) => (
        <button
          key={s}
          onClick={() => setStatus(s)}
          disabled={pending || status === s}
          className="chip"
          data-on={status === s ? "true" : "false"}
          style={{ fontSize: 10, padding: "2px 7px" }}
        >
          {s === "offen" ? "Offen" : s === "in_bearbeitung" ? "Werkstatt" : "Fertig"}
        </button>
      ))}
    </div>
  );
}
