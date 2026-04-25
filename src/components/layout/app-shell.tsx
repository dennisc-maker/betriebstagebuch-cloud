"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { SessionPayload } from "@/lib/auth";

export function AppShell({
  session,
  openCount,
  ausschlagCount,
  crumbs,
  children,
}: {
  session: SessionPayload;
  openCount: number;
  ausschlagCount: number;
  crumbs?: string[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar
        session={session}
        openCount={openCount}
        ausschlagCount={ausschlagCount}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <div
          className="drawer-scrim"
          data-open="true"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="main">
        <div style={{ position: "sticky", top: 0, zIndex: 30 }}>
          <Topbar
            session={session}
            crumbs={crumbs}
            onMenuClick={() => setMobileOpen(true)}
          />
        </div>
        <div className="content">
          <div className="content-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
