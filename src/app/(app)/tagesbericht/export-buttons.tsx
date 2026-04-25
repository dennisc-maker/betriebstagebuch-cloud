"use client";

import { Printer, FileText, FileSpreadsheet } from "lucide-react";

type Row = {
  time: string;
  shift: string;
  vehicle: string | null;
  line: string | null;
  faultCode: string | null;
  faultText: string | null;
  dispatcher: string | null;
  measureText: string | null;
  status: string;
};

const SHIFT_DE: Record<string, string> = {
  frueh: "Frühschicht",
  mittel: "Mittelschicht",
  spaet: "Spätschicht",
};

const STATUS_DE: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  abgeschlossen: "Abgeschlossen",
};

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ExportButtons({ rows, date }: { rows: Row[]; date: string }) {
  const handlePrint = () => window.print();

  const handleExcel = () => {
    const headers = ["Zeit", "Schicht", "Fahrzeug", "Linie", "Fehler-Code", "Fehler", "Disponent", "Maßnahme", "Status"];
    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.time,
          SHIFT_DE[r.shift] ?? r.shift,
          r.vehicle,
          r.line,
          r.faultCode,
          r.faultText,
          r.dispatcher,
          r.measureText,
          STATUS_DE[r.status] ?? r.status,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tagesbericht_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePdf = () => {
    // Browser print → "Save as PDF" Dialog
    const oldTitle = document.title;
    document.title = `Tagesbericht_${date}_NVB`;
    window.print();
    setTimeout(() => {
      document.title = oldTitle;
    }, 1000);
  };

  return (
    <>
      <button onClick={handlePrint} className="btn btn-sm" type="button">
        <Printer size={13} />
        Drucken
      </button>
      <button onClick={handlePdf} className="btn btn-sm" type="button" title="Drucken-Dialog → 'Als PDF speichern'">
        <FileText size={13} />
        PDF
      </button>
      <button onClick={handleExcel} className="btn btn-sm" type="button" title="CSV (Excel-kompatibel)">
        <FileSpreadsheet size={13} />
        Excel
      </button>
    </>
  );
}
