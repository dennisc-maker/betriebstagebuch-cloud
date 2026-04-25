import { db } from "@/lib/db";
import {
  dispatchers, drivers, vehicles, busLines, faultCatalog, outageReasons,
  measureTemplates, driverMessageTypes, notifiedParties, workshopStaff,
} from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CrudTable } from "./crud-table";

const TYPE_CONFIG = {
  disponenten: {
    label: "Disponenten",
    table: dispatchers,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "E-Mail", type: "email" },
    ],
  },
  werkstatt: {
    label: "Werkstatt",
    table: workshopStaff,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "roleLabel", label: "Rolle", type: "text" },
    ],
  },
  fahrer: {
    label: "Fahrpersonal",
    table: drivers,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "employeeId", label: "Personalnr.", type: "text" },
    ],
  },
  fahrzeuge: {
    label: "Fahrzeuge",
    table: vehicles,
    fields: [
      { key: "vehicleNumber", label: "Fahrzeug-Nr.", type: "text", required: true },
      { key: "licensePlate", label: "Kennzeichen", type: "text" },
      { key: "vehicleType", label: "Fahrzeugtyp", type: "text" },
    ],
  },
  linien: {
    label: "Linien",
    table: busLines,
    fields: [
      { key: "lineNumber", label: "Linien-Nr.", type: "text", required: true },
      { key: "name", label: "Name", type: "text" },
    ],
  },
  fehlerkatalog: {
    label: "Fehlerkatalog",
    table: faultCatalog,
    fields: [
      { key: "faultCode", label: "Code", type: "text", required: true },
      { key: "faultText", label: "Beschreibung", type: "text", required: true },
      {
        key: "category",
        label: "Kategorie",
        type: "select",
        required: true,
        options: ["technik", "fahrer", "extern", "infrastruktur", "sonstiges"],
      },
      {
        key: "severity",
        label: "Schwere",
        type: "select",
        required: true,
        options: ["minor", "major", "critical"],
      },
    ],
  },
  ausfallgruende: {
    label: "Ausfall-Gruende",
    table: outageReasons,
    fields: [
      { key: "reasonCode", label: "Code", type: "text", required: true },
      { key: "reasonLabel", label: "Bezeichnung", type: "text", required: true },
    ],
  },
  massnahmen: {
    label: "Massnahmen-Vorlagen",
    table: measureTemplates,
    fields: [
      { key: "label", label: "Bezeichnung", type: "text", required: true },
      { key: "isQuickPick", label: "Quick-Pick", type: "checkbox" },
    ],
  },
  fahrermeldungen: {
    label: "Fahrer-Meldungen",
    table: driverMessageTypes,
    fields: [
      { key: "typeCode", label: "Code", type: "text", required: true },
      { key: "label", label: "Bezeichnung", type: "text", required: true },
    ],
  },
  informierte: {
    label: "Informierte Stellen",
    table: notifiedParties,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "E-Mail", type: "email" },
      { key: "phone", label: "Telefon", type: "text" },
      { key: "category", label: "Kategorie", type: "text" },
    ],
  },
} as const;

export default async function AdminCrudPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "betriebsleiter" && session.role !== "admin") {
    redirect("/");
  }

  const { type } = await params;
  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
  if (!cfg) notFound();

  const rows = await db.select().from(cfg.table).orderBy(asc(cfg.table.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand-700 mb-2">
          <ChevronLeft size={14} />
          Admin-Bereich
        </Link>
        <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
          <Settings size={22} className="text-brand-700" />
          {cfg.label} verwalten
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {rows.length} Einträge - Änderungen erscheinen sofort fuer alle Disponenten.
        </p>
      </div>

      <CrudTable
        type={type}
        fields={cfg.fields as unknown as { key: string; label: string; type: string; required?: boolean; options?: string[] }[]}
        rows={rows as Record<string, unknown>[]}
      />
    </div>
  );
}
