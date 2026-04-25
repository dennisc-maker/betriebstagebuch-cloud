"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SHIFT_LABEL, SHIFT_HOURS, shiftFromTime, nowTime } from "@/lib/utils";
import type { SessionPayload } from "@/lib/auth";
import { NvbMark } from "@/components/nvb-logo";
import {
  Home,
  Plus,
  ListTree,
  Calendar,
  BarChart3,
  AlertTriangle,
  Database,
  Settings,
  LogOut,
  Wrench,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  primary?: boolean;
  badge?: number;
};

export function Sidebar({
  session,
  openCount,
  ausschlagCount,
  mobileOpen,
  onMobileClose,
}: {
  session: SessionPayload;
  openCount: number;
  ausschlagCount: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const shift = shiftFromTime(nowTime());
  const isAdmin = session.role === "betriebsleiter" || session.role === "admin";

  const items: NavItem[] = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/erfassung", label: "Neuer Vorfall", icon: Plus, primary: true },
    { href: "/vorfaelle", label: "Vorfälle", icon: ListTree },
    { href: "/werkstatt", label: "Werkstatt-Inbox", icon: Wrench },
    { href: "/tagesbericht", label: "Tagesbericht", icon: Calendar },
    { href: "/monatsanalyse", label: "Monatsanalyse", icon: BarChart3 },
    {
      href: "/ausschlaege",
      label: "Ausschläge",
      icon: AlertTriangle,
      badge: ausschlagCount,
    },
    { href: "/stammdaten", label: "Stammdaten", icon: Database },
  ];

  const initials = session.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sidebar" data-mobile-open={mobileOpen ? "true" : "false"} aria-label="Navigation">
      <div className="sidebar-head">
        <NvbMark size={32} />
        <div>
          <div className="logo-text" style={{ fontSize: 14, lineHeight: 1.2 }}>
            Betriebstagebuch
          </div>
          <div className="logo-sub">NVB Birkenfeld</div>
        </div>
      </div>

      <div className="shift-pill-wrap">
        <div className="shift-pill" data-shift={shift}>
          <span className="shift-dot" />
          <span style={{ flex: 1 }}>{SHIFT_LABEL[shift]}</span>
          <span className="shift-time">{SHIFT_HOURS[shift]}</span>
        </div>
      </div>

      <nav className="nav">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              data-active={active ? "true" : "false"}
              data-primary={item.primary ? "true" : "false"}
              onClick={onMobileClose}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {item.badge && item.badge > 0 ? <span className="nav-badge">{item.badge}</span> : null}
              {item.href === "/" && openCount > 0 ? (
                <span
                  className="nav-badge"
                  style={{ background: "var(--accent)" }}
                >
                  {openCount}
                </span>
              ) : null}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="nav-divider" />
            <Link
              href="/admin"
              className="nav-item"
              data-active={pathname.startsWith("/admin") ? "true" : "false"}
              onClick={onMobileClose}
            >
              <Settings className="nav-icon" />
              <span className="nav-label">Verwaltung</span>
              <span
                className="nav-badge"
                style={{ background: "var(--ink-400)", fontSize: "9.5px", padding: "1px 5px" }}
              >
                BL
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">{initials}</div>
        <div className="user-meta">
          <div className="user-name">{session.fullName}</div>
          <div className="user-role" style={{ textTransform: "capitalize" }}>{session.role}</div>
        </div>
        <form action="/api/logout" method="post">
          <button className="icon-btn" title="Abmelden" type="submit">
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
}
