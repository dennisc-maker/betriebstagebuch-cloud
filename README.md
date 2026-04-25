# Betriebstagebuch · NVB Birkenfeld (Cloud)

Cloud-Variante des Betriebstagebuchs für die Nahverkehrsbetriebe Birkenfeld GmbH.
Identisch zur lokalen Version, läuft auf **Supabase + Vercel**.

## Stack

- **Next.js 15** + React 19 + TypeScript
- **Supabase** für Postgres + Auth + Storage (Frankfurt-Region empfohlen)
- **Drizzle ORM** für typed SQL
- **Tailwind CSS** + custom Design-System
- **Recharts** für Charts

## Setup-Anleitung (für Live-Deployment)

### 1. Supabase-Projekt anlegen

1. https://supabase.com → "New Project"
2. **Region: `eu-central-1` (Frankfurt)** wählen (DSGVO!)
3. Datenbank-Passwort merken
4. Nach 1-2 Min ist das Projekt bereit

### 2. Environment Variables holen

Im Supabase-Dashboard:

- **Settings → API**:
  - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public)
  - `SUPABASE_SERVICE_ROLE_KEY` (service_role secret — geheim halten!)

- **Settings → Database → Connection String → URI** (Mode: **Transaction**, Port 6543):
  - `DATABASE_URL` — Pooler-URL (für Vercel Serverless wichtig)

### 3. Lokal entwickeln

```bash
cp .env.example .env.local
# .env.local befüllen mit Supabase-Credentials
npm install

# Schema in Supabase pushen
npm run db:push

# Demo-User + Daten anlegen
npm run db:seed
```

`db:seed` legt automatisch an:
- 7 Demo-User in Supabase Auth (Passwort: `demo1234`)
- Storage-Bucket `incident-attachments`
- 1.400+ Vorfälle aus echter NVB-Excel-Datei
- Stammdaten: 5 Disponenten, 89 Fahrer, 54 Fahrzeuge, 11 Linien, 290 Fehler-Codes

```bash
npm run dev
# http://localhost:3000
# Login: leiter / demo1234
```

### 4. Deploy auf Vercel

```bash
# Repo zu GitHub pushen (siehe unten)
# Dann auf vercel.com:
# 1. New Project → Import vom GitHub-Repo
# 2. Framework: Next.js (auto-detected)
# 3. Environment Variables: ALLE 4 Vars aus .env.local kopieren
# 4. Deploy
```

**Wichtig:** Bei Vercel **Region Frankfurt (`fra1`)** in Project Settings → Functions → Region wählen, damit die Latenz zur Supabase-DB klein bleibt.

### 5. Supabase Storage Policies

Nach dem ersten Deploy in Supabase-Dashboard → Storage → `incident-attachments` → Policies:

```sql
-- Authentifizierte User dürfen Anhänge hochladen
CREATE POLICY "Auth users upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incident-attachments');

-- Authentifizierte User dürfen lesen
CREATE POLICY "Auth users read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'incident-attachments');

-- Authentifizierte User dürfen löschen
CREATE POLICY "Auth users delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'incident-attachments');
```

(Wird durch `db:seed` automatisch berücksichtigt für Bucket-Erstellung. Policies kommen aus Supabase-Defaults.)

## Demo-Logins

Nach `db:seed`:

| Username | Passwort | Rolle |
|----------|----------|-------|
| `leiter` | `demo1234` | Betriebsleiter |
| `andre` | `demo1234` | Disponent |
| `eileen` | `demo1234` | Disponentin |
| `werkstatt` | `demo1234` | Werkstatt |

Username + `@dispo.local` als E-Mail (intern). Login per Username genügt.

## Unterschiede zur Lokal-Version

| Feature | Lokal | Cloud |
|---------|-------|-------|
| Datenbank | SQLite (eine Datei) | Supabase Postgres |
| Auth | Eigene JWT in Cookie | Supabase Auth |
| Storage | Filesystem `data/uploads/` | Supabase Storage Bucket |
| DB-Backup | Datei kopieren | Supabase Auto-Backups |
| Hosting | Lokaler PC | Vercel |
| Datenresidenz | LAN-Server | Supabase Frankfurt |
| Internet | Optional | Erforderlich |

## DSGVO-Hinweise

- Datenresidenz Frankfurt (eu-central-1) — Pflicht beim Setup wählen!
- Auftragsverarbeitungsvertrag (AVV) mit Supabase abschließen
- Auftragsverarbeitungsvertrag mit Vercel abschließen
- Audit-Trail vorhanden (`incident_audit`-Tabelle)
- 2FA optional für Betriebsleiter aktivierbar

## Wichtige Dateien

- `src/lib/db/schema.ts` — Drizzle Postgres Schema
- `src/lib/supabase/server.ts` — Supabase Server Client
- `src/lib/auth.ts` — Session über Supabase Auth
- `src/middleware.ts` — Auth-Redirect für protected routes
- `scripts/seed.ts` — Demo-User + Daten anlegen
