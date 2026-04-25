/**
 * Seed via Supabase Management API + REST API
 * Umgeht das Direct-Postgres-Verbindungs-Problem auf Free-Tier (IPv6-only).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN!;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MGMT_TOKEN || !PROJECT_REF) {
  console.error("Set env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_MGMT_TOKEN, SUPABASE_PROJECT_REF");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSql(query: string): Promise<unknown> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MGMT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SQL failed: ${res.status} ${errText}`);
  }
  return res.json();
}

function escapeStr(s: string | null | undefined): string {
  if (s == null) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

const DEMO_USERS = [
  { username: "andre", fullName: "Andre Wild", role: "disponent", shiftDefault: "frueh" },
  { username: "eileen", fullName: "Eileen Haas", role: "disponent", shiftDefault: "mittel" },
  { username: "julian", fullName: "Julian Violino", role: "disponent", shiftDefault: "spaet" },
  { username: "sascha", fullName: "Sascha Seither", role: "disponent", shiftDefault: null },
  { username: "volker", fullName: "Volker Martin", role: "disponent", shiftDefault: null },
  { username: "leiter", fullName: "Betriebsleiter NVB", role: "betriebsleiter", shiftDefault: null },
  { username: "werkstatt", fullName: "Werkstatt-Leitung", role: "werkstatt", shiftDefault: null },
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

function categorizeFault(text: string): string {
  const t = text.toLowerCase();
  if (/krank|urlaub|dienst|fahrer|personal/.test(t)) return "fahrer";
  if (/unfall|stau|sperrung|bauma|wetter|verkehr|strasse/.test(t)) return "extern";
  if (/ladestation|haltestelle|infrastruktur/.test(t)) return "infrastruktur";
  if (/adblue|akku|batterie|tank|abgas|motor|reifen|bremse|t.r|licht|klima|kupplung|steuerger.t|sensor|fahrzeug|defekt|getrieb|olstand|scheibe/.test(t))
    return "technik";
  return "sonstiges";
}

function severity(text: string): string {
  const t = text.toLowerCase();
  if (/unfall|brand|kritisch|defekt total|ausgefallen|kollision|liegengeblieben|abschlepp/.test(t)) return "critical";
  if (/kocht|leuchtet|schwer|warnung|st.rung|warnleuchte|defekt/.test(t)) return "major";
  return "minor";
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
  console.log("Cloud-Seed via API startet...");
  await ensureStorageBucket();

  console.log("Anlegen/Update Auth-User in Supabase...");
  const authUserIds: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const authId = await ensureSupabaseUser(u.username, DEMO_PASSWORD);
    authUserIds[u.username] = authId;
    console.log(`  ${u.username} -> ${authId.slice(0, 8)}...`);
  }

  console.log("Wipe public.* Tabellen...");
  await runSql(`
    TRUNCATE TABLE incident_comments, incident_attachments, incident_audit, user_sessions,
                   incidents, monthly_targets, notified_parties, driver_message_types,
                   measure_templates, outage_reasons, fault_catalog, trips, circulations,
                   bus_lines, vehicles, drivers, workshop_staff, dispatchers, users
    RESTART IDENTITY CASCADE;
  `);

  console.log("Inserting users...");
  const usersValues = DEMO_USERS.map((u) =>
    `('${authUserIds[u.username]}', ${escapeStr(u.username)}, ${escapeStr(u.fullName)}, ${escapeStr(u.username + "@dispo.local")}, ${escapeStr(u.role)}, ${u.shiftDefault ? escapeStr(u.shiftDefault) : "NULL"})`,
  ).join(",\n");
  await runSql(`INSERT INTO users (auth_user_id, username, full_name, email, role, shift_default) VALUES ${usersValues};`);

  console.log("Loading extracted.json...");
  const jsonPath = path.resolve(process.cwd(), "data", "extracted.json");
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const dailySheets = json.daily_sheets;
  const unique = json.unique_values as Record<string, string[]>;

  // Stammdaten
  console.log("Stammdaten: Disponenten, Werkstatt, Fahrer, Fahrzeuge...");
  await runSql(`INSERT INTO dispatchers (name) VALUES ${unique.disposition.map((n) => `(${escapeStr(n)})`).join(",")};`);
  await runSql(`INSERT INTO workshop_staff (name) VALUES ${unique.werkstatt.map((n) => `(${escapeStr(n)})`).join(",")};`);
  await runSql(`INSERT INTO drivers (name) VALUES ${unique.fahrpersonal.map((n) => `(${escapeStr(n)})`).join(",")};`);
  await runSql(`INSERT INTO vehicles (vehicle_number, vehicle_type) VALUES ${unique.fahrzeuge.map((n) => `(${escapeStr(n)}, 'Stadtbus NVB')`).join(",")};`);

  console.log("Linien...");
  const lineNames: Record<string, string> = {
    "801": "Idar-Oberstein – Birkenfeld", "802": "Idar-Oberstein – Niederbrombach",
    "803": "Idar-Oberstein – Hettstein", "804": "Idar-Oberstein – Fischbach",
    "805": "Idar-Oberstein – Kirschweiler", "806": "Idar-Oberstein – Veitsrodt",
    "812": "Idar-Oberstein – Algenrodt", "813": "Idar-Oberstein – Tiefenstein",
    "835": "Schule – Hauptbahnhof", "870": "Stadtlinie",
  };
  await runSql(`INSERT INTO bus_lines (line_number, name) VALUES ${unique.linien.map((n) => `(${escapeStr(String(n))}, ${escapeStr(lineNames[String(n)] ?? null)})`).join(",")};`);

  console.log("Umlaeufe...");
  const circs = unique.umlaeufe.filter((u) => u && u !== "None").map(String);
  for (let i = 0; i < circs.length; i += 100) {
    const chunk = circs.slice(i, i + 100);
    await runSql(`INSERT INTO circulations (circulation_number) VALUES ${chunk.map((c) => `(${escapeStr(c)})`).join(",")};`);
  }

  console.log("Fahrten...");
  const trips = unique.fahrt_nr.filter((t) => t && t !== "None").map(String);
  for (let i = 0; i < trips.length; i += 100) {
    const chunk = trips.slice(i, i + 100);
    const values = chunk.map((tn) => {
      const lineCandidate = tn.length >= 4 ? tn.substring(0, 3) : null;
      return `(${escapeStr(tn)}, ${lineCandidate ? `(SELECT id FROM bus_lines WHERE line_number = ${escapeStr(lineCandidate)})` : "NULL"})`;
    }).join(",");
    await runSql(`INSERT INTO trips (trip_number, line_id) VALUES ${values};`);
  }

  console.log("Fehlerkatalog (290 Eintraege)...");
  const faults = unique.fehler.map((text, idx) => ({
    code: `F-${String(idx + 1).padStart(4, "0")}`,
    text,
    category: categorizeFault(text),
    sev: severity(text),
  }));
  for (let i = 0; i < faults.length; i += 100) {
    const chunk = faults.slice(i, i + 100);
    const values = chunk.map((f) => `(${escapeStr(f.code)}, ${escapeStr(f.text)}, '${f.category}', '${f.sev}')`).join(",");
    await runSql(`INSERT INTO fault_catalog (fault_code, fault_text, category, severity) VALUES ${values};`);
  }

  console.log("Ausfall-Gruende...");
  await runSql(`INSERT INTO outage_reasons (reason_code, reason_label) VALUES ${unique.linienausfall_grund.map((label, idx) => `(${escapeStr(`R-${String(idx + 1).padStart(3, "0")}`)}, ${escapeStr(label)})`).join(",")};`);

  console.log("Massnahmen...");
  await runSql(`INSERT INTO measure_templates (label, is_quick_pick) VALUES ${unique.massnahme_dispo.map((label, idx) => `(${escapeStr(label)}, ${idx < 8 ? "true" : "false"})`).join(",")};`);

  console.log("Fahrer-Meldungen...");
  await runSql(`INSERT INTO driver_message_types (type_code, label, requires_date_range) VALUES ${unique.fahrer_meldungen.map((label, idx) => `(${escapeStr(`DM-${String(idx + 1).padStart(2, "0")}`)}, ${escapeStr(label)}, ${/krank|urlaub/i.test(label) ? "true" : "false"})`).join(",")};`);

  console.log("Informierte Stellen...");
  await runSql(`INSERT INTO notified_parties (name) VALUES ${unique.informierte_stellen.map((n) => `(${escapeStr(n)})`).join(",")};`);

  // Get IDs
  const dispRows = (await runSql(`SELECT id, name FROM dispatchers`)) as Array<{ id: number; name: string }>;
  const drvRows = (await runSql(`SELECT id FROM drivers`)) as Array<{ id: number }>;
  const vehRows = (await runSql(`SELECT id FROM vehicles`)) as Array<{ id: number }>;
  const lineRows = (await runSql(`SELECT id FROM bus_lines`)) as Array<{ id: number }>;
  const tripRows = (await runSql(`SELECT id FROM trips`)) as Array<{ id: number }>;
  const faultIds = ((await runSql(`SELECT id, fault_text FROM fault_catalog`)) as Array<{ id: number; fault_text: string }>);
  const orRows = (await runSql(`SELECT id FROM outage_reasons`)) as Array<{ id: number }>;
  const dmtRows = (await runSql(`SELECT id FROM driver_message_types`)) as Array<{ id: number }>;
  const userRows = (await runSql(`SELECT id, username FROM users`)) as Array<{ id: number; username: string }>;

  const dispatcherIds = dispRows.map((d) => d.id);
  const driverIds = drvRows.map((d) => d.id);
  const vehicleIds = vehRows.map((v) => v.id);
  const lineIds = lineRows.map((l) => l.id);
  const tripIds = tripRows.map((t) => t.id);
  const faultIdList = faultIds.map((f) => f.id);
  const orIds = orRows.map((o) => o.id);
  const dmtIds = dmtRows.map((d) => d.id);
  const defaultUserId = userRows[0]!.id;
  const measureLabels = unique.massnahme_dispo;

  function dispatcherForShift(date: string, shift: string): number {
    const dayHash = new Date(date).getDate();
    const shiftIdx = shift === "frueh" ? 0 : shift === "mittel" ? 1 : 2;
    return dispatcherIds[(dayHash + shiftIdx) % dispatcherIds.length]!;
  }

  function findFaultId(text: unknown): number | null {
    if (!text || typeof text !== "string") return null;
    const tl = text.toLowerCase().trim();
    const exact = faultIds.find((f) => f.fault_text.toLowerCase().trim() === tl);
    if (exact) return exact.id;
    return faultIds.find((f) => f.fault_text.toLowerCase().includes(tl) || tl.includes(f.fault_text.toLowerCase()))?.id ?? null;
  }

  type IncidentInsert = {
    incidentDate: string;
    incidentTime: string;
    shift: string;
    dispatcherId: number;
    vehicleId: number | null;
    lineId: number | null;
    tripId: number | null;
    driverId: number | null;
    faultId: number | null;
    outageReasonId?: number | null;
    driverMessageTypeId?: number | null;
    measureText: string | null;
    notes: string | null;
    status: string;
    createdBy: number;
  };

  const allIncidents: IncidentInsert[] = [];

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
      const fId = inc.fehler ? findFaultId(inc.fehler) ?? pick(faultIdList) : null;
      const status = Math.random() < 0.05 ? "offen" : Math.random() < 0.15 ? "in_bearbeitung" : "abgeschlossen";
      allIncidents.push({
        incidentDate: date, incidentTime: timeS, shift: sft,
        dispatcherId: dispatcherForShift(date, sft),
        vehicleId: pickOrNull(vehicleIds, 0.6),
        lineId: pickOrNull(lineIds, 0.5),
        tripId: pickOrNull(tripIds, 0.4),
        driverId: pickOrNull(driverIds, 0.4),
        faultId: fId,
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
      let fId: number | null = null;
      let oId: number | null = null;
      let dmtId: number | null = null;
      if (r < 0.8) fId = pick(faultIdList);
      else if (r < 0.95) { oId = pick(orIds); if (Math.random() < 0.3) fId = pick(faultIdList); }
      else dmtId = pick(dmtIds);
      const ageDays = totalDays - day;
      const probAbgeschlossen = Math.min(0.95, 0.5 + ageDays * 0.02);
      const status = Math.random() < probAbgeschlossen ? "abgeschlossen" :
                     Math.random() < 0.6 ? "in_bearbeitung" : "offen";
      allIncidents.push({
        incidentDate: dateStr, incidentTime: timeS, shift: sft,
        dispatcherId: dispatcherForShift(dateStr, sft),
        vehicleId: pickOrNull(vehicleIds, 0.7),
        lineId: pickOrNull(lineIds, 0.6),
        tripId: pickOrNull(tripIds, 0.4),
        driverId: pickOrNull(driverIds, 0.5),
        faultId: fId, outageReasonId: oId, driverMessageTypeId: dmtId,
        measureText: Math.random() < 0.6 ? pick(measureLabels) : null,
        notes: null,
        status, createdBy: defaultUserId,
      });
    }
  }

  console.log(`Inserting ${allIncidents.length} incidents in batches...`);
  for (let i = 0; i < allIncidents.length; i += 50) {
    const chunk = allIncidents.slice(i, i + 50);
    const values = chunk.map((x) =>
      `(${escapeStr(x.incidentDate)}, ${escapeStr(x.incidentTime)}, ${escapeStr(x.shift)}, ${x.dispatcherId}, ${x.vehicleId ?? "NULL"}, ${x.lineId ?? "NULL"}, ${x.tripId ?? "NULL"}, ${x.driverId ?? "NULL"}, ${x.faultId ?? "NULL"}, ${x.outageReasonId ?? "NULL"}, ${x.driverMessageTypeId ?? "NULL"}, ${escapeStr(x.measureText)}, ${escapeStr(x.notes)}, ${escapeStr(x.status)}, ${x.createdBy})`,
    ).join(",");
    await runSql(`INSERT INTO incidents (incident_date, incident_time, shift, dispatcher_id, vehicle_id, line_id, trip_id, driver_id, fault_id, outage_reason_id, driver_message_type_id, measure_text, notes, status, created_by) VALUES ${values};`);
    if ((i / 50) % 10 === 0) process.stdout.write(`  ${i}/${allIncidents.length}\r`);
  }
  console.log(`  ${allIncidents.length}/${allIncidents.length} ✓`);

  // Targets
  const targets = [];
  for (const m of [3, 4]) {
    targets.push(
      `(2026, ${m}, 'technik', 350, ${defaultUserId})`,
      `(2026, ${m}, 'fahrer', 60, ${defaultUserId})`,
      `(2026, ${m}, 'extern', 80, ${defaultUserId})`,
      `(2026, ${m}, 'infrastruktur', 25, ${defaultUserId})`,
      `(2026, ${m}, 'sonstiges', 60, ${defaultUserId})`,
    );
  }
  await runSql(`INSERT INTO monthly_targets (year, month, fault_category, max_count, set_by) VALUES ${targets.join(",")};`);

  console.log("\nSeed fertig. Demo-Logins:");
  console.log("  leiter / demo1234 (Betriebsleiter)");
  console.log("  andre / demo1234 (Disponent)");
  console.log("  werkstatt / demo1234 (Werkstatt)");
}

main().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
