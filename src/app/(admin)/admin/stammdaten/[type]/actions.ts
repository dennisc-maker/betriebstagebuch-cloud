"use server";

import { db } from "@/lib/db";
import {
  dispatchers, drivers, vehicles, busLines, faultCatalog, outageReasons,
  measureTemplates, driverMessageTypes, notifiedParties, workshopStaff,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

const TABLES: Record<string, SQLiteTable> = {
  disponenten: dispatchers,
  werkstatt: workshopStaff,
  fahrer: drivers,
  fahrzeuge: vehicles,
  linien: busLines,
  fehlerkatalog: faultCatalog,
  ausfallgruende: outageReasons,
  massnahmen: measureTemplates,
  fahrermeldungen: driverMessageTypes,
  informierte: notifiedParties,
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  disponenten: ["name"],
  werkstatt: ["name"],
  fahrer: ["name"],
  fahrzeuge: ["vehicleNumber"],
  linien: ["lineNumber"],
  fehlerkatalog: ["faultCode", "faultText", "category", "severity"],
  ausfallgruende: ["reasonCode", "reasonLabel"],
  massnahmen: ["label"],
  fahrermeldungen: ["typeCode", "label"],
  informierte: ["name"],
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  vehicleNumber: "Fahrzeug-Nr.",
  lineNumber: "Linien-Nr.",
  faultCode: "Code",
  faultText: "Beschreibung",
  category: "Kategorie",
  severity: "Schwere",
  reasonCode: "Code",
  reasonLabel: "Bezeichnung",
  label: "Bezeichnung",
  typeCode: "Code",
};

// Auto-Code-Generator für Fehler/Reason/MessageType
async function autoCode(type: string, prefix: string, codeField: string, table: SQLiteTable): Promise<string> {
  const rows = await db.select().from(table);
  const existing = rows
    .map((r) => (r as Record<string, unknown>)[codeField] as string)
    .filter((c) => typeof c === "string" && c.startsWith(prefix));
  const nums = existing.map((c) => parseInt(c.replace(prefix, ""), 10)).filter((n) => !isNaN(n));
  const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
  const padding = type === "fehlerkatalog" ? 4 : 3;
  return `${prefix}${String(nextNum).padStart(padding, "0")}`;
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("UNIQUE constraint") || msg.includes("UNIQUE")) {
    return "Dieser Eintrag existiert bereits (Code oder Name muss eindeutig sein).";
  }
  if (msg.includes("NOT NULL constraint") || msg.includes("NOT NULL")) {
    const m = msg.match(/(\w+)\.(\w+)/);
    const field = m ? FIELD_LABELS[m[2]!] ?? m[2] : "Pflichtfeld";
    return `${field} muss ausgefüllt werden.`;
  }
  if (msg.includes("FOREIGN KEY")) {
    return "Verknüpfung ist ungültig (referenzierter Datensatz fehlt).";
  }
  return "Speichern fehlgeschlagen. Bitte Eingaben prüfen und nochmal versuchen.";
}

export async function createRecord(type: string, data: Record<string, unknown>) {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return { error: "Keine Berechtigung" };
  }
  const table = TABLES[type];
  if (!table) return { error: "Unbekannter Datentyp" };

  // Required-Field Validation (vor DB!)
  const required = REQUIRED_FIELDS[type] ?? [];
  const missing = required.filter((f) => {
    const v = data[f];
    return v == null || v === "";
  });
  if (missing.length > 0) {
    const labels = missing.map((f) => FIELD_LABELS[f] ?? f);
    return { error: `Bitte ausfüllen: ${labels.join(", ")}` };
  }

  // Auto-Code für Code-basierte Tables wenn leer
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) cleaned[k] = v === "" ? null : v;

  if (type === "fehlerkatalog" && (!cleaned.faultCode || cleaned.faultCode === null)) {
    cleaned.faultCode = await autoCode(type, "F-", "faultCode", table);
  } else if (type === "ausfallgruende" && (!cleaned.reasonCode || cleaned.reasonCode === null)) {
    cleaned.reasonCode = await autoCode(type, "R-", "reasonCode", table);
  } else if (type === "fahrermeldungen" && (!cleaned.typeCode || cleaned.typeCode === null)) {
    cleaned.typeCode = await autoCode(type, "DM-", "typeCode", table);
  }

  try {
    await db.insert(table).values(cleaned as never);
    revalidatePath(`/admin/stammdaten/${type}`);
    revalidatePath(`/stammdaten/${type}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function updateRecord(type: string, id: number, data: Record<string, unknown>) {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return { error: "Keine Berechtigung" };
  }
  const table = TABLES[type];
  if (!table) return { error: "Unbekannter Datentyp" };

  const required = REQUIRED_FIELDS[type] ?? [];
  const missing = required.filter((f) => {
    const v = data[f];
    return v == null || v === "";
  });
  if (missing.length > 0) {
    const labels = missing.map((f) => FIELD_LABELS[f] ?? f);
    return { error: `Bitte ausfüllen: ${labels.join(", ")}` };
  }

  try {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) cleaned[k] = v === "" ? null : v;
    // @ts-expect-error generic table id
    await db.update(table).set(cleaned).where(eq(table.id, id));
    revalidatePath(`/admin/stammdaten/${type}`);
    revalidatePath(`/stammdaten/${type}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function toggleActive(type: string, id: number, isActive: boolean) {
  const session = await getSession();
  if (!session || (session.role !== "betriebsleiter" && session.role !== "admin")) {
    return { error: "Keine Berechtigung" };
  }
  const table = TABLES[type];
  if (!table) return { error: "Unbekannter Datentyp" };

  try {
    // @ts-expect-error generic
    await db.update(table).set({ isActive }).where(eq(table.id, id));
    revalidatePath(`/admin/stammdaten/${type}`);
    revalidatePath(`/stammdaten/${type}`);
    return {};
  } catch (err) {
    return { error: friendlyError(err) };
  }
}
