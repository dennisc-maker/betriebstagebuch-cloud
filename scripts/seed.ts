/**
 * Seed fuer Cloud-Version (Supabase)
 *
 * Voraussetzungen in .env.local:
 *   DATABASE_URL                       (Supabase Postgres Connection-String)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { db, client } from "../src/lib/db";
import {
  users,
  dispatchers,
  workshopStaff,
  drivers,
  vehicles,
  busLines,
  circulations,
  trips,
  faultCatalog,
  outageReasons,
  measureTemplates,
  driverMessageTypes,
  notifiedParties,
  incidents,
  monthlyTargets,
} from "../src/lib/db/schema";
import fs from "node:fs";
import path from "node:path";

type ExtractedRecord = {
  Disposition?: string | null;
  Werkstatt?: string | null;
  Fahrpersonal?: string | null;
  Fahrzeuge?: string | null;
  "Umläufe"?: string | number | null;
  Linie?: string | number | null;
  "Fahrt Nr."?: string | number | null;
  "Fehler/Störung Bus; Anliegen Fahrer"?: string | null;
  "Linienausfall Grund"?: string | null;
  "Massnahme Dispo"?: string | null;
  "Fahrer Meldungen"?: string | null;
  "Informierte Stellen"?: string | null;
};

type DailyIncident = {
  uhrzeit: string | null;
  kom: string | null;
  fehler: string | null;
  standort: string | null;
  massnahme: string | null;
  erstellt_von: string | null;
};

type DailySheet = {
  sheet_name: string;
  shifts: Record<string, { name: string | null }>;
  incidents: DailyIncident[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FEHLER: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY muessen in .env.local gesetzt sein.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  { username: "andre", fullName: "Andre Wild", role: "disponent" as const, shiftDefault: "frueh" as const },
  { username: "eileen", fullName: "Eileen Haas", role: "disponent" as const, shiftDefault: "mittel" as const },
  { username: "julian", fullName: "Julian Violino", role: "disponent" as const, shiftDefault: "spaet" as const },
  { username: "sascha", fullName: "Sascha Seither", role: "disponent" as const, shiftDefault: null },
  { username: "volker", fullName: "Volker Martin", role: "disponent" as const, shiftDefault: null },
  { username: "leiter", fullName: "Betriebsleiter NVB", role: "betriebsleiter" as const, shiftDefault: null },
  { username: "werkstatt", fullName: "Werkstatt-Leitung", role: "werkstatt" as const, shiftDefault: null },
];

const DEMO_PASSWORD = "demo1234";

async function ensureSupabaseUser(username: string, password: string): Promise<string> {
  const email = `${username}@dispo.local`;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${username}: ${error?.message}`);
  return data.user.id;
}

function shiftFromTime(time: string): "frueh" | "mittel" | "spaet" {
  const h = parseInt(time.split(":")[0] ?? "0", 10);
  if (h >= 6 && h < 14) return "frueh";
  if (h >= 14 && h < 22) return "mittel";
  return "spaet";
}

function categorizeFault(text: string): "technik" | "fahrer" | "extern" | "infrastruktur" | "sonstiges" {
  const t = text.toLowerCase();
  if (/krank|urlaub|dienst|fahrer|personal/.test(t)) return "fahrer";
  if (/unfall|stau|sperrung|bauma|wetter|verkehr|strasse/.test(t)) return "extern";
  if (/ladestation|haltestelle|infrastruktur/.test(t)) return "infrastruktur";
  if (/adblue|akku|batterie|tank|abgas|motor|reifen|bremse|t.r|licht|klima|kupplung|steuerger.t|sensor|fahrzeug|defekt|getrieb|olstand|scheibe/.test(t))
    return "technik";
  return "sonstiges";
}

function severity(text: string): "minor" | "major" | "critical" {
  const t = text.toLowerCase();
  if (/unfall|brand|kritisch|defekt total|ausgefallen|kollision|liegengeblieben|abschlepp/.test(t)) return "critical";
  if (/kocht|leuchtet|schwer|warnung|st.rung|warnleuchte|defekt/.test(t)) return "major";
  return "minor";
}

function findFaultId(text: unknown, faults: { id: number; faultText: string }[]): number | null {
  if (!text || typeof text !== "string") return null;
  const tl = text.toLowerCase().trim();
  const exact = faults.find((f) => f.faultText.toLowerCase().trim() === tl);
  if (exact) return exact.id;
  return faults.find((f) => f.faultText.toLowerCase().includes(tl) || tl.includes(f.faultText.toLowerCase()))?.id ?? null;
}

function isoFromSheetName(sheetName: string): string | null {
  const m = sheetName.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] as T; }
function pickOrNull<T>(arr: T[], probability = 0.85): T | null {
  if (Math.random() > probability) return null;
  return pick(arr);
}

async function ensureStorageBucket() {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "incident-attachments")) {
    await admin.storage.createBucket("incident-attachments", { public: false });
    console.log("  Storage-Bucket 'incident-attachments' angelegt");
  }
}

async function main() {
  console.log("Cloud-Seed startet...");
  await ensureStorageBucket();

  console.log("Anlegen/Update Auth-User in Supabase...");
  const authUserIds: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const authId = await ensureSupabaseUser(u.username, DEMO_PASSWORD);
    authUserIds[u.username] = authId;
    console.log(`  ${u.username} -> ${authId.slice(0, 8)}...`);
  }

  console.log("Wipe public.* Tabellen...");
  await client.unsafe(`
    TRUNCATE TABLE incident_comments, incident_attachments, incident_audit, user_sessions,
                   incidents, monthly_targets, notified_parties, driver_message_types,
                   measure_templates, outage_reasons, fault_catalog, trips, circulations,
                   bus_lines, vehicles, drivers, workshop_staff, dispatchers, users
    RESTART IDENTITY CASCADE
  `);

  const insertedUsers = await db
    .insert(users)
    .values(DEMO_USERS.map((u) => ({
      authUserId: authUserIds[u.username]!,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      shiftDefault: u.shiftDefault,
      email: `${u.username}@dispo.local`,
    })))
    .returning();
  console.log(`  ${insertedUsers.length} App-User`);

  const jsonPath = path.resolve(process.cwd(), "data", "extracted.json");
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const stammdaten: ExtractedRecord[] = json.stammdaten;
  const dailySheets: DailySheet[] = json.daily_sheets;
  const unique = json.unique_values as Record<string, string[]>;

  const insertedDispatchers = await db.insert(dispatchers).values(unique.disposition.map((name) => ({ name }))).returning();
  await db.insert(workshopStaff).values(unique.werkstatt.map((name) => ({ name })));
  const insertedDrivers = await db.insert(drivers).values(unique.fahrpersonal.map((name) => ({ name }))).returning();
  const insertedVehicles = await db.insert(vehicles).values(unique.fahrzeuge.map((vehicleNumber) => ({ vehicleNumber, vehicleType: "Stadtbus NVB" }))).returning();

  const lineNames: Record<string, string> = {
    "801": "Idar-Oberstein – Birkenfeld", "802": "Idar-Oberstein – Niederbrombach",
    "803": "Idar-Oberstein – Hettstein", "804": "Idar-Oberstein – Fischbach",
    "805": "Idar-Oberstein – Kirschweiler", "806": "Idar-Oberstein – Veitsrodt",
    "812": "Idar-Oberstein – Algenrodt", "813": "Idar-Oberstein – Tiefenstein",
    "835": "Schule – Hauptbahnhof", "870": "Stadtlinie",
  };
  const insertedLines = await db.insert(busLines).values(
    unique.linien.map((lineNumber) => ({ lineNumber: String(lineNumber), name: lineNames[String(lineNumber)] ?? null })),
  ).returning();
  const lineByNum = new Map(insertedLines.map((l) => [l.lineNumber, l.id]));

  const circRows = unique.umlaeufe.filter((u) => u && u !== "None").map((c) => ({ circulationNumber: String(c) }));
  for (let i = 0; i < circRows.length; i += 200) {
    await db.insert(circulations).values(circRows.slice(i, i + 200));
  }

  const tripRows = unique.fahrt_nr.filter((t) => t && t !== "None").map((tripNumber) => {
    const tn = String(tripNumber);
    const lineCandidate = tn.length >= 4 ? tn.substring(0, 3) : null;
    return { tripNumber: tn, lineId: lineCandidate ? lineByNum.get(lineCandidate) ?? null : null };
  });
  for (let i = 0; i < tripRows.length; i += 200) {
    await db.insert(trips).values(tripRows.slice(i, i + 200));
  }
  const insertedTrips = await db.select().from(trips);

  const faultRows = unique.fehler.map((text, idx) => ({
    faultCode: `F-${String(idx + 1).padStart(4, "0")}`,
    faultText: text,
    category: categorizeFault(text),
    severity: severity(text),
  }));
  for (let i = 0; i < faultRows.length; i += 200) {
    await db.insert(faultCatalog).values(faultRows.slice(i, i + 200));
  }
  const insertedFaults = await db.select().from(faultCatalog);
  const faultLookup = insertedFaults.map((f) => ({ id: f.id, faultText: f.faultText }));
  const faultIds = insertedFaults.map((f) => f.id);

  const insertedOrs = await db.insert(outageReasons).values(
    unique.linienausfall_grund.map((label, idx) => ({
      reasonCode: `R-${String(idx + 1).padStart(3, "0")}`,
      reasonLabel: label,
    })),
  ).returning();
  const orIds = insertedOrs.map((o) => o.id);

  await db.insert(measureTemplates).values(unique.massnahme_dispo.map((label, idx) => ({ label, isQuickPick: idx < 8 })));

  const insertedDmts = await db.insert(driverMessageTypes).values(
    unique.fahrer_meldungen.map((label, idx) => ({
      typeCode: `DM-${String(idx + 1).padStart(2, "0")}`,
      label,
      requiresDateRange: /krank|urlaub/i.test(label),
    })),
  ).returning();
  const dmtIds = insertedDmts.map((d) => d.id);

  await db.insert(notifiedParties).values(unique.informierte_stellen.map((name) => ({ name })));

  console.log(`  Stammdaten: ${insertedDispatchers.length} Disp, ${insertedDrivers.length} Fahrer, ${insertedVehicles.length} Bus, ${insertedLines.length} Linien, ${insertedFaults.length} Fehler`);

  // Incidents
  const allIncidents: typeof incidents.$inferInsert[] = [];
  const defaultUserId = insertedUsers[0]!.id;
  const dispatcherIds = insertedDispatchers.map((d) => d.id);
  const driverIds = insertedDrivers.map((d) => d.id);
  const vehicleIds = insertedVehicles.map((v) => v.id);
  const lineIds = insertedLines.map((l) => l.id);
  const tripIds = insertedTrips.map((t) => t.id);
  const measureLabels = unique.massnahme_dispo;

  function dispatcherForShift(date: string, shift: string): number {
    const dayHash = new Date(date).getDate();
    const shiftIdx = shift === "frueh" ? 0 : shift === "mittel" ? 1 : 2;
    return dispatcherIds[(dayHash + shiftIdx) % dispatcherIds.length]!;
  }

  for (const sheet of dailySheets) {
    const date = isoFromSheetName(sheet.sheet_name);
    if (!date) continue;
    for (const inc of sheet.incidents) {
      if (!inc.uhrzeit && !inc.fehler && !inc.kom) continue;
      let timeS = "08:00";
      if (inc.uhrzeit) {
        const m = String(inc.uhrzeit).match(/(\d{1,2}):(\d{2})/);
        if (m) timeS = `${m[1]!.padStart(2, "0")}:${m[2]}`;
      }
      const sft = shiftFromTime(timeS);
      const faultId = inc.fehler ? findFaultId(inc.fehler, faultLookup) ?? pick(faultIds) : null;
      const status: "offen" | "in_bearbeitung" | "abgeschlossen" =
        Math.random() < 0.05 ? "offen" : Math.random() < 0.15 ? "in_bearbeitung" : "abgeschlossen";
      allIncidents.push({
        incidentDate: date, incidentTime: timeS, shift: sft,
        dispatcherId: dispatcherForShift(date, sft),
        vehicleId: pickOrNull(vehicleIds, 0.6) ?? undefined,
        lineId: pickOrNull(lineIds, 0.5) ?? undefined,
        tripId: pickOrNull(tripIds, 0.4) ?? undefined,
        driverId: pickOrNull(driverIds, 0.4) ?? undefined,
        faultId: faultId ?? undefined,
        measureText: inc.massnahme || (Math.random() < 0.5 ? pick(measureLabels) : null),
        notes: inc.kom || null,
        status, createdBy: defaultUserId,
      });
    }
  }

  const start = new Date("2026-03-01");
  const totalDays = Math.floor((new Date("2026-04-30").getTime() - start.getTime()) / 86400000);
  for (let day = 0; day <= totalDays; day++) {
    const dt = new Date(start);
    dt.setDate(dt.getDate() + day);
    const dateStr = dt.toISOString().slice(0, 10);
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
    const baseCount = isWeekend ? 8 : 22;
    const count = Math.max(3, baseCount + Math.floor(Math.random() * 12) - 4);
    for (let i = 0; i < count; i++) {
      const hour = Math.random() < 0.4 ? 6 + Math.floor(Math.random() * 8) :
                   Math.random() < 0.7 ? 14 + Math.floor(Math.random() * 8) :
                   Math.random() < 0.9 ? 22 + Math.floor(Math.random() * 2) :
                   Math.floor(Math.random() * 6);
      const minute = Math.floor(Math.random() * 60);
      const timeS = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const sft = shiftFromTime(timeS);
      const r = Math.random();
      let faultId, outageReasonId, driverMessageTypeId;
      if (r < 0.8) faultId = pick(faultIds);
      else if (r < 0.95) { outageReasonId = pick(orIds); if (Math.random() < 0.3) faultId = pick(faultIds); }
      else driverMessageTypeId = pick(dmtIds);
      const ageDays = totalDays - day;
      const probAbgeschlossen = Math.min(0.95, 0.5 + ageDays * 0.02);
      const status: "offen" | "in_bearbeitung" | "abgeschlossen" =
        Math.random() < probAbgeschlossen ? "abgeschlossen" :
        Math.random() < 0.6 ? "in_bearbeitung" : "offen";
      allIncidents.push({
        incidentDate: dateStr, incidentTime: timeS, shift: sft,
        dispatcherId: dispatcherForShift(dateStr, sft),
        vehicleId: pickOrNull(vehicleIds, 0.7) ?? undefined,
        lineId: pickOrNull(lineIds, 0.6) ?? undefined,
        tripId: pickOrNull(tripIds, 0.4) ?? undefined,
        driverId: pickOrNull(driverIds, 0.5) ?? undefined,
        faultId, outageReasonId, driverMessageTypeId,
        measureText: Math.random() < 0.6 ? pick(measureLabels) : null,
        status, createdBy: defaultUserId,
      });
    }
  }

  for (let i = 0; i < allIncidents.length; i += 100) {
    await db.insert(incidents).values(allIncidents.slice(i, i + 100));
  }
  console.log(`  ${allIncidents.length} Vorfaelle`);

  const targets = [];
  for (const m of [3, 4]) {
    targets.push(
      { year: 2026, month: m, faultCategory: "technik", maxCount: 350 },
      { year: 2026, month: m, faultCategory: "fahrer", maxCount: 60 },
      { year: 2026, month: m, faultCategory: "extern", maxCount: 80 },
      { year: 2026, month: m, faultCategory: "infrastruktur", maxCount: 25 },
      { year: 2026, month: m, faultCategory: "sonstiges", maxCount: 60 },
    );
  }
  await db.insert(monthlyTargets).values(targets);

  console.log("\nSeed fertig. Demo-Logins:");
  console.log("  leiter / demo1234 (Betriebsleiter)");
  console.log("  andre / demo1234 (Disponent)");
  console.log("  werkstatt / demo1234 (Werkstatt)");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
