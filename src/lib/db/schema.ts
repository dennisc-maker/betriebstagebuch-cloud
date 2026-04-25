import { pgTable, serial, text, integer, boolean, timestamp, primaryKey, uuid, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =====================================================
// USERS (verknuepft mit Supabase auth.users via authUserId)
// =====================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  authUserId: uuid("auth_user_id").unique(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role", { enum: ["disponent", "betriebsleiter", "werkstatt", "admin"] }).notNull(),
  shiftDefault: text("shift_default", { enum: ["frueh", "mittel", "spaet"] }),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// STAMMDATEN
// =====================================================
export const dispatchers = pgTable("dispatchers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workshopStaff = pgTable("workshop_staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  roleLabel: text("role_label"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  employeeId: text("employee_id"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  licensePlate: text("license_plate"),
  vehicleType: text("vehicle_type"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const busLines = pgTable("bus_lines", {
  id: serial("id").primaryKey(),
  lineNumber: text("line_number").notNull().unique(),
  name: text("name"),
  color: text("color"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const circulations = pgTable("circulations", {
  id: serial("id").primaryKey(),
  circulationNumber: text("circulation_number").notNull().unique(),
  lineId: integer("line_id").references(() => busLines.id),
  shift: text("shift", { enum: ["frueh", "mittel", "spaet"] }),
  isActive: boolean("is_active").notNull().default(true),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  tripNumber: text("trip_number").notNull().unique(),
  lineId: integer("line_id").references(() => busLines.id),
  isActive: boolean("is_active").notNull().default(true),
});

export const faultCatalog = pgTable("fault_catalog", {
  id: serial("id").primaryKey(),
  faultCode: text("fault_code").notNull().unique(),
  faultText: text("fault_text").notNull(),
  category: text("category", {
    enum: ["technik", "fahrer", "extern", "infrastruktur", "sonstiges"],
  })
    .notNull()
    .default("technik"),
  severity: text("severity", { enum: ["minor", "major", "critical"] })
    .notNull()
    .default("minor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outageReasons = pgTable("outage_reasons", {
  id: serial("id").primaryKey(),
  reasonCode: text("reason_code").notNull().unique(),
  reasonLabel: text("reason_label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const measureTemplates = pgTable("measure_templates", {
  id: serial("id").primaryKey(),
  label: text("label").notNull().unique(),
  isQuickPick: boolean("is_quick_pick").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const driverMessageTypes = pgTable("driver_message_types", {
  id: serial("id").primaryKey(),
  typeCode: text("type_code").notNull().unique(),
  label: text("label").notNull(),
  requiresDateRange: boolean("requires_date_range").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const notifiedParties = pgTable("notified_parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
});

// =====================================================
// OPERATIVE DATEN
// =====================================================
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  incidentDate: text("incident_date").notNull(),
  incidentTime: text("incident_time").notNull(),
  shift: text("shift", { enum: ["frueh", "mittel", "spaet"] }).notNull(),

  dispatcherId: integer("dispatcher_id").references(() => dispatchers.id),
  workshopStaffId: integer("workshop_staff_id").references(() => workshopStaff.id),
  driverId: integer("driver_id").references(() => drivers.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  lineId: integer("line_id").references(() => busLines.id),
  circulationId: integer("circulation_id").references(() => circulations.id),
  tripId: integer("trip_id").references(() => trips.id),
  faultId: integer("fault_id").references(() => faultCatalog.id),
  outageReasonId: integer("outage_reason_id").references(() => outageReasons.id),
  driverMessageTypeId: integer("driver_message_type_id").references(() => driverMessageTypes.id),

  measureText: text("measure_text"),
  notifiedPartyIds: text("notified_party_ids"),
  notes: text("notes"),

  status: text("status", { enum: ["offen", "in_bearbeitung", "abgeschlossen"] })
    .notNull()
    .default("offen"),

  createdBy: integer("created_by").references(() => users.id),
  lockedBy: integer("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  reminderAt: text("reminder_at"),
  reminderText: text("reminder_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const incidentAudit = pgTable("incident_audit", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action", { enum: ["insert", "update", "delete"] }).notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidentComments = pgTable("incident_comments", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidentAttachments = pgTable("incident_attachments", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monthlyTargets = pgTable(
  "monthly_targets",
  {
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    faultCategory: text("fault_category").notNull(),
    maxCount: integer("max_count").notNull(),
    setBy: integer("set_by").references(() => users.id),
    setAt: timestamp("set_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.year, t.month, t.faultCategory] }),
  }),
);

export const savedViews = pgTable("saved_views", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id),
  name: text("name").notNull(),
  filtersJson: jsonb("filters_json"),
  columnsJson: jsonb("columns_json"),
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type FaultCatalogEntry = typeof faultCatalog.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type BusLine = typeof busLines.$inferSelect;
export type Dispatcher = typeof dispatchers.$inferSelect;
