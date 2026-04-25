"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Copy } from "lucide-react";
import { saveTargets, copyTargetsFromPreviousMonth } from "./actions";

type Target = {
  year: number;
  month: number;
  faultCategory: string;
  maxCount: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  technik: "Technik",
  fahrer: "Fahrer-Themen",
  extern: "Externe Ursachen",
  infrastruktur: "Infrastruktur",
  sonstiges: "Sonstiges",
};

export function TargetsEditor({
  year,
  month,
  initial,
}: {
  year: number;
  month: number;
  initial: Target[];
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(initial.map((t) => [t.faultCategory, t.maxCount])),
  );
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const save = () => {
    startTransition(async () => {
      const data = Object.entries(values).map(([faultCategory, maxCount]) => ({
        faultCategory,
        maxCount,
      }));
      await saveTargets(year, month, data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      router.refresh();
    });
  };

  const copyPrev = () => {
    startTransition(async () => {
      const res = await copyTargetsFromPreviousMonth(year, month);
      if (res.count) {
        router.refresh();
      }
    });
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Sollwerte pro Fehler-Kategorie</div>
        <div className="page-actions">
          <button onClick={copyPrev} disabled={pending} className="btn btn-sm">
            <Copy size={13} /> Vom Vormonat übernehmen
          </button>
        </div>
      </div>
      <div className="card-pad">
        {success && (
          <div
            style={{
              background: "var(--sev-ok-bg)",
              color: "var(--sev-ok)",
              padding: "8px 12px",
              borderRadius: "var(--r-md)",
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            Gespeichert. Ausschläge werden ab sofort gegen diese Werte geprüft.
          </div>
        )}
        <table className="table" style={{ background: "transparent" }}>
          <thead>
            <tr>
              <th>Kategorie</th>
              <th>Max-Wert (Soll)</th>
              <th style={{ width: 200 }}>Erläuterung</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((t) => (
              <tr key={t.faultCategory}>
                <td style={{ fontWeight: 600 }}>{CATEGORY_LABEL[t.faultCategory] ?? t.faultCategory}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={values[t.faultCategory] ?? 0}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [t.faultCategory]: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="input"
                    style={{ width: 120 }}
                  />
                </td>
                <td style={{ fontSize: 11.5, color: "var(--ink-500)" }}>
                  {t.faultCategory === "technik"
                    ? "z.B. Bremsen, Beleuchtung, Motor"
                    : t.faultCategory === "fahrer"
                      ? "Krankmeldungen, Urlaube, Tausch"
                      : t.faultCategory === "extern"
                        ? "Stau, Unfälle, Wetter"
                        : t.faultCategory === "infrastruktur"
                          ? "Haltestellen, Ladestationen"
                          : "Alles andere"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={save} disabled={pending} className="btn btn-accent">
            <Save size={14} /> Sollwerte speichern
          </button>
        </div>
      </div>
    </div>
  );
}
