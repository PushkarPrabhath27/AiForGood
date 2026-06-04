"use client";

import * as React from "react";
import { Search, Bell, Menu, Activity, Cpu, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = React.useState(searchParams?.get("search") || "");
  const [showNotifications, setShowNotifications] = React.useState(false);

  const [notifications, setNotifications] = React.useState([
    { id: 1, text: "Suresh Kumar confirmed donation eligibility", type: "guardian", read: false },
    { id: 2, text: "Vikram Reddy's B+ unit match approved", type: "match", read: false },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (searchVal) params.set("search", searchVal);
      else params.delete("search");
      if (pathname === "/dashboard" || pathname === "/") {
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal, pathname, router]);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notif-dropdown")) {
        setShowNotifications(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4 sm:px-5 w-full flex-shrink-0 relative z-30 select-none"
      style={{
        background: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(16px)",
        borderColor: "var(--bg-border)",
      }}
    >
      {/* Mobile Drawer Trigger */}
      <div className="flex items-center gap-3 md:hidden">
        <Sheet>
          <SheetTrigger
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r" style={{ background: "var(--bg-void)", borderColor: "var(--bg-border)" }}>
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access clinical and inventory dashboards.</SheetDescription>
            </SheetHeader>
            <Sidebar className="!flex w-full border-r-0" />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ fontFamily: "var(--font-space-grotesk)", color: "var(--text-primary)" }}>
            Rakta<span style={{ color: "var(--accent-crimson)" }}>Setu</span>
          </span>
        </div>
      </div>

      {/* LEFT: Breadcrumb (desktop) */}
      <div className="hidden md:flex items-center gap-1.5 min-w-0 flex-1">
        <span
          className="text-[10px] font-bold tracking-widest uppercase truncate"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
        >
          PATIENTS
        </span>
        <span style={{ color: "var(--text-dim)" }} className="text-[10px]">/ </span>
        <span
          className="text-[10px] font-bold tracking-widest uppercase truncate"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
        >
          Priya Sharma
        </span>
        <span style={{ color: "var(--text-dim)" }} className="text-[10px]">/ </span>
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
        >
          NOOR ENGINE
        </span>
      </div>

      {/* CENTER: Search Bar */}
      <div className="flex items-center w-full max-w-sm relative mx-4">
        <Search
          className="w-3.5 h-3.5 absolute left-3 pointer-events-none"
          style={{ color: "var(--text-dim)" }}
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search patients, alerts, banks..."
          aria-label="Search patients"
          className="w-full h-8 pl-8 pr-16 rounded-md text-[11px] transition-all outline-none"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
          onFocus={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "rgba(0, 180, 216, 0.4)";
            (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(0, 180, 216, 0.08)";
          }}
          onBlur={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "var(--bg-border)";
            (e.target as HTMLInputElement).style.boxShadow = "none";
          }}
        />
        {/* Cmd+K hint */}
        <div className="absolute right-2 flex items-center gap-0.5 pointer-events-none">
          <kbd
            className="text-[8px] px-1 py-0.5 rounded"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-dim)",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* RIGHT: Controls */}
      <div className="flex items-center gap-2">

        {/* HYD City Chip */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.1em",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent-violet)" }}
          />
          HYD
        </div>

        {/* NOOR Engine status chip */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-bold cursor-help hover:scale-[1.02] transition-all"
          style={{
            background: "rgba(0, 180, 216, 0.06)",
            border: "1px solid rgba(0, 180, 216, 0.2)",
            color: "var(--accent-cyan)",
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.08em",
          }}
          title="NOOR Engine is monitoring 2 patients"
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--accent-emerald)" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "var(--accent-emerald)" }}
            />
          </span>
          ● NOOR ENGINE v2.1
        </div>

        {/* Notifications */}
        <div className="relative notif-dropdown">
          <button
            aria-label={`${unreadCount} unread notifications`}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-cyan)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border"
                style={{
                  background: "var(--accent-crimson)",
                  borderColor: "var(--bg-void)",
                  boxShadow: "0 0 6px rgba(230, 57, 70, 0.6)",
                }}
              />
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl p-4 shadow-2xl z-50 space-y-3 animate-in slide-in-from-top-2 duration-200"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderTop: "2px solid var(--accent-crimson)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="flex justify-between items-center pb-2 border-b"
                style={{ borderColor: "var(--bg-border)" }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-crimson)" }}
                >
                  SYSTEM ALERTS
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                    className="text-[9px] font-bold transition-colors"
                    style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-cyan)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.map((notif) => {
                  const Icon = notif.type === "guardian" ? Activity : ShieldAlert;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                        );
                        toast.info(notif.text);
                      }}
                      className={cn(
                        "p-2.5 rounded-md border text-[10px] leading-snug cursor-pointer transition-all flex items-center gap-2.5",
                        notif.read ? "opacity-50" : ""
                      )}
                      style={{
                        background: notif.read ? "transparent" : "rgba(0, 180, 216, 0.04)",
                        border: notif.read
                          ? `1px solid var(--bg-border)`
                          : `1px solid rgba(0, 180, 216, 0.15)`,
                        borderLeft: notif.read ? "" : "2px solid var(--accent-cyan)",
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: notif.read ? "var(--text-dim)" : "var(--text-secondary)",
                      }}
                    >
                      <Icon
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: notif.read ? "var(--text-dim)" : "var(--accent-cyan)" }}
                      />
                      <span className="truncate">{notif.text}</span>
                      {!notif.read && (
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto"
                          style={{ background: "var(--accent-crimson)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
