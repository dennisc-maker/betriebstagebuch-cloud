"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Plus, Search, Sun, Moon, Menu } from "lucide-react";
import type { SessionPayload } from "@/lib/auth";

export function Topbar({
  session,
  crumbs,
  onMenuClick,
}: {
  session: SessionPayload;
  crumbs?: string[];
  onMenuClick?: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30 * 1000);

    const stored = localStorage.getItem("dispolog-theme");
    if (stored === "dark") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
    return () => clearInterval(id);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("dispolog-theme", next);
  };

  const time = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "--:--";

  const date = now
    ? new Intl.DateTimeFormat("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now)
    : "";

  const breadcrumbs = crumbs ?? ["Betriebstagebuch"];

  return (
    <header className="topbar">
      {onMenuClick && (
        <button
          className="icon-btn mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Menü öffnen"
          title="Menü"
        >
          <Menu size={18} />
        </button>
      )}
      <div className="crumbs">
        {breadcrumbs.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="crumb-sep">/</span>}
            {i === breadcrumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
          </span>
        ))}
      </div>

      <div className="topbar-spacer" />

      <Link
        href="/vorfaelle"
        className="search"
        title="Zur Vorfall-Suche"
        aria-label="Zur Vorfall-Suche"
      >
        <Search size={14} />
        <span style={{ flex: 1, color: "var(--ink-500)" }}>Vorfälle durchsuchen…</span>
      </Link>

      <div className="tb-clock" title={date}>
        <span className="live-dot" />
        <span>{date} · {time}</span>
      </div>

      <div className="vr" style={{ height: 24 }} />

      <button
        className="btn btn-sm btn-icon"
        title={theme === "light" ? "Dark Mode aktivieren" : "Light Mode aktivieren"}
        aria-label={theme === "light" ? "Dark Mode aktivieren" : "Light Mode aktivieren"}
        onClick={toggleTheme}
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      </button>

      <button
        className="btn btn-sm btn-icon"
        title="Benachrichtigungen"
        aria-label="Benachrichtigungen anzeigen"
      >
        <Bell size={15} />
      </button>

      <Link href="/erfassung" className="btn btn-sm btn-accent" aria-label="Neuen Vorfall erfassen">
        <Plus size={14} />
        <span>Neuer Vorfall</span>
      </Link>
    </header>
  );
}
