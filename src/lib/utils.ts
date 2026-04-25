import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Shift = "frueh" | "mittel" | "spaet";

export const SHIFT_LABEL: Record<Shift, string> = {
  frueh: "Frühschicht",
  mittel: "Mittelschicht",
  spaet: "Spätschicht",
};

export const SHIFT_HOURS: Record<Shift, string> = {
  frueh: "06:00 – 14:00",
  mittel: "14:00 – 22:00",
  spaet: "22:00 – 06:00",
};

export function shiftFromTime(timeStr: string): Shift {
  const [hStr] = timeStr.split(":");
  const h = parseInt(hStr ?? "0", 10);
  if (h >= 6 && h < 14) return "frueh";
  if (h >= 14 && h < 22) return "mittel";
  return "spaet";
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${h?.padStart(2, "0") ?? "00"}:${m?.padStart(2, "0") ?? "00"}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
