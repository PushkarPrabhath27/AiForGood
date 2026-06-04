"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Network, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      label: "OVERVIEW",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "PATIENTS",
      href: "/dashboard",
      icon: <Users className="w-[18px] h-[18px]" />,
      active: pathname.startsWith("/dashboard/patient"),
    },
    {
      label: "RAKTAGRID",
      href: "/dashboard/grid",
      icon: <Network className="w-[18px] h-[18px]" />,
      active: pathname === "/dashboard/grid",
    },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r p-4 transition-all duration-300 ease-in-out relative flex-shrink-0 h-screen select-none",
        isCollapsed ? "w-[64px]" : "w-[240px]",
        className
      )}
      style={{
        background: "var(--bg-void)",
        borderColor: "var(--bg-border)",
      }}
    >
      {/* Neural mesh overlay */}
      <div className="absolute inset-0 neural-mesh opacity-[0.015] pointer-events-none" />

      {/* ── LOGO AREA ── */}
      <div
        className={cn(
          "flex items-center gap-2.5 mb-8 mt-1 px-1 relative z-10",
          isCollapsed ? "justify-center" : "justify-start"
        )}
      >
        {/* Blood drop icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-base"
          style={{
            background: "rgba(230, 57, 70, 0.12)",
            border: "1px solid rgba(230, 57, 70, 0.35)",
            boxShadow: "0 0 12px rgba(230, 57, 70, 0.2)",
          }}
        >
          🩸
        </div>

        {!isCollapsed && (
          <div className="animate-in fade-in duration-200">
            <div className="flex items-baseline gap-1">
              <span
                className="font-bold text-sm tracking-tight leading-none"
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  color: "var(--text-primary)",
                }}
              >
                RaktaSetu
              </span>
              <span
                className="font-bold text-sm tracking-tight leading-none"
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  color: "var(--accent-crimson)",
                  textShadow: "0 0 8px rgba(230, 57, 70, 0.5)",
                }}
              >
                NOOR
              </span>
            </div>
            {/* Live engine status */}
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 pulse-dot"
                style={{ background: "var(--accent-cyan)" }}
              />
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: "var(--accent-cyan)",
                  opacity: 0.8,
                }}
              >
                NOOR ENGINE v2.1
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="flex-1 flex flex-col gap-1 relative z-10">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            aria-label={item.label}
            className={cn(
              "flex items-center gap-3 h-10 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 group relative",
              isCollapsed && "justify-center px-0"
            )}
            style={{
              background: item.active ? "rgba(230, 57, 70, 0.08)" : "transparent",
              color: item.active ? "var(--accent-crimson)" : "var(--text-secondary)",
              borderLeft: item.active && !isCollapsed ? "3px solid var(--accent-crimson)" : "3px solid transparent",
              boxShadow: item.active ? "inset 0 0 20px rgba(230, 57, 70, 0.05)" : "none",
            }}
          >
            <span
              className={cn(
                "flex-shrink-0 transition-all duration-200",
                item.active
                  ? "drop-shadow-[0_0_6px_rgba(230,57,70,0.5)]"
                  : "opacity-50 group-hover:opacity-80"
              )}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {!isCollapsed && (
              <span
                className="animate-in fade-in duration-200 truncate"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {item.label}
              </span>
            )}

            {/* Hover glow effect */}
            {!item.active && (
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: "rgba(0, 180, 216, 0.04)" }}
              />
            )}
          </Link>
        ))}
      </nav>

      {/* ── SYSTEM STATUS MINI-PANEL ── */}
      <div
        className="pt-4 border-t flex flex-col gap-3 relative z-10"
        style={{ borderColor: "var(--bg-border)" }}
      >
        {!isCollapsed && (
          <div
            className="px-3 py-2.5 rounded-lg animate-in fade-in duration-200"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
            }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-widest mb-2 block"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-dim)",
              }}
            >
              System Status
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "NOOR", color: "var(--accent-emerald)" },
                { label: "GRID", color: "var(--accent-emerald)" },
                { label: "COMMS", color: "var(--accent-emerald)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                  />
                  <span
                    className="text-[9px] font-bold tracking-widest"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="text-[9px] font-bold ml-auto"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: s.color,
                    }}
                  >
                    ONLINE
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center justify-center gap-2 h-8 rounded-md transition-all duration-200",
            isCollapsed ? "w-full" : "w-full"
          )}
          style={{
            background: "transparent",
            border: `1px solid var(--bg-border)`,
            color: "var(--text-dim)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,180,216,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
          }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>COLLAPSE</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
