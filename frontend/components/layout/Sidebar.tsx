"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Map, ChevronLeft, ChevronRight, LogOut, RotateCcw, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useResetDemo } from "@/lib/hooks/usePatients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();
  const resetMutation = useResetDemo();
  const router = useRouter();

  const [isIssueResolved, setIsIssueResolved] = React.useState(false);
  const [isResolvingIssue, setIsResolvingIssue] = React.useState(false);

  const handleResolveIssue = async () => {
    setIsResolvingIssue(true);
    // Simulate auto diagnostics resolve sequence
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsResolvingIssue(false);
    setIsIssueResolved(true);
    toast.success("Leaflet map container conflict successfully resolved.");
  };

  const handleResetDemo = async () => {
    try {
      await resetMutation.mutateAsync();
      toast.success("Sandbox mock database successfully reset to initial seeds.");
      router.push("/dashboard");
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch {
      toast.error("Failed to reset sandbox database.");
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem("raktasetu_session");
    toast.success("Coordinator session logged out.");
    router.push("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "Patients Directory",
      href: "/dashboard",
      icon: <Users className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/patient"),
    },
    {
      label: "RaktaGrid Logistics",
      href: "/dashboard/grid",
      icon: <Map className="w-5 h-5" />,
      active: pathname === "/dashboard/grid",
    },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-aether-void border-r border-aether-ink p-4 transition-all duration-300 ease-in-out relative flex-shrink-0 h-screen select-none",
        isCollapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      {/* Drifting neural mesh overlay underneath */}
      <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />

      {/* Brand Logo in Space Grotesk */}
      <div className={cn("flex items-center gap-2 mb-8 mt-2 px-1 relative z-10", isCollapsed ? "justify-center" : "justify-start")}>
        <div className="w-9 h-9 rounded-lg bg-aether-slate border border-pulse-cyan/20 flex items-center justify-center font-extrabold text-white text-lg flex-shrink-0 shadow-lg shadow-cyan-900/10">
          <span className="filter drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]">🩸</span>
        </div>
        {!isCollapsed && (
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-pulse-cyan to-pulse-magenta bg-clip-text text-transparent font-space truncate animate-in fade-in duration-200">
            RaktaSetu NOOR
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 relative z-10">
        {navItems.map((item, index) => {
          return (
            <Link
              key={index}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 group relative",
                item.active
                  ? "bg-pulse-cyan/5 border-l-2 border-l-pulse-cyan border-y-transparent border-r-transparent text-pulse-cyan shadow-[0_0_15px_rgba(0,240,255,0.03)]"
                  : "text-slate-400 border border-transparent hover:bg-aether-slate/40 hover:text-pulse-cyan hover:border-pulse-cyan/5",
                isCollapsed && "justify-center px-0 border-l-0"
              )}
            >
              {/* Vertical Active Line Glow effect */}
              {item.active && !isCollapsed && (
                <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-pulse-cyan shadow-[0_0_8px_rgba(0,240,255,1)]" />
              )}
              
              <span className={cn("flex-shrink-0 transition-transform duration-200 group-hover:scale-110", item.active ? "text-pulse-cyan filter drop-shadow-[0_0_4px_rgba(0,240,255,0.3)]" : "text-slate-500 group-hover:text-pulse-cyan")} aria-hidden="true">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="animate-in fade-in duration-200 truncate font-space">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Session */}
      <div className="pt-4 border-t border-aether-ink/60 flex flex-col gap-3 relative z-10">
        {!isCollapsed && (
          <div className="px-3 py-2 aether-glass rounded-lg border border-pulse-cyan/10 flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              {/* Online indicator cyan ring */}
              <div className="w-8 h-8 rounded-full bg-aether-slate border border-pulse-cyan flex items-center justify-center font-bold text-pulse-cyan text-xs flex-shrink-0 relative">
                CO
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-pulse-emerald border border-aether-midnight animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-200 truncate font-space">S. Kulkarni</p>
                <p className="text-[8px] font-bold text-pulse-cyan truncate mt-0.5 uppercase tracking-wider font-mono">Coordinator</p>
              </div>
            </div>
            <Button
              onClick={handleLogOut}
              size="icon"
              variant="ghost"
              aria-label="Log out session"
              className="w-7 h-7 rounded-md text-slate-500 hover:text-pulse-magenta hover:bg-pulse-magenta/5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* "1 Issue" Badge & Slide-out Sheet */}
        {!isIssueResolved && (
          <Sheet>
            <SheetTrigger
              render={
                <button
                  className={cn(
                    "mx-2 mb-1 px-3 py-1.5 rounded-md bg-pulse-magenta/10 border border-pulse-magenta/25 text-pulse-magenta hover:text-white hover:bg-pulse-magenta/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all animate-pulse",
                    isCollapsed && "mx-auto px-0 w-9 h-9 justify-center rounded-full"
                  )}
                />
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-pulse-magenta animate-ping flex-shrink-0" />
              {!isCollapsed ? "1 Active Issue" : "1"}
            </SheetTrigger>
            <SheetContent side="left" className="bg-aether-midnight border-r border-aether-ink text-slate-100 p-6 flex flex-col justify-between w-80 sm:w-96 select-none font-sans">
              <div className="space-y-6">
                <SheetHeader className="pb-4 border-b border-aether-ink">
                  <SheetTitle className="text-white font-extrabold text-base flex items-center gap-2 leading-none font-space uppercase tracking-wider">
                    <AlertTriangle className="w-5 h-5 text-pulse-magenta animate-bounce" />
                    SYSTEM DIAGNOSTICS
                  </SheetTitle>
                  <SheetDescription className="text-slate-500 text-xs mt-1 font-mono uppercase">
                    clinical active sandbox issue records
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-pulse-cyan block font-mono">
                      Conflict Diagnostics
                    </span>
                    <p className="text-xs text-slate-200 font-bold aether-glass border border-pulse-cyan/10 p-3 rounded-md leading-relaxed">
                      RaktaGrid map initialization failed — Leaflet container conflict
                    </p>
                  </div>

                  <div className="space-y-1 aether-glass border border-pulse-cyan/10 p-4 rounded-md">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1 font-mono">
                      Target Stack Trace
                    </span>
                    <code className="text-[9px] font-mono text-slate-400 leading-normal block">
                      Error: Map container is already initialized.<br/>
                      &nbsp;&nbsp;at L.Map.initialize (map.js:14)<br/>
                      &nbsp;&nbsp;at new L.Map (map.js:3)<br/>
                      &nbsp;&nbsp;at CityBloodMapInner.tsx:118
                    </code>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-aether-ink flex flex-col gap-2 font-mono">
                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                  Click below to dispatch automatic clinical boundary clears, reloading the Leaflet container dynamically.
                </p>
                <Button
                  onClick={handleResolveIssue}
                  disabled={isResolvingIssue}
                  className="w-full bg-pulse-magenta hover:bg-pulse-magenta/80 text-white font-bold text-xs h-10 rounded-md flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                >
                  {isResolvingIssue ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Resolving conflict...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Resolve Conflict
                    </>
                  )}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Reset Sandbox & Collapsible triggers */}
        <div className="flex flex-col gap-2 font-mono">
          {!isCollapsed ? (
            <Button
              onClick={handleResetDemo}
              disabled={resetMutation.isPending}
              variant="ghost"
              className="w-full h-9 text-[9px] font-extrabold uppercase tracking-widest text-pulse-cyan border border-pulse-cyan/20 hover:text-white hover:bg-pulse-cyan/10 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {resetMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-pulse-cyan" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              {resetMutation.isPending ? "Resetting..." : "Reset Sandbox Mocks"}
            </Button>
          ) : (
            <Button
              onClick={handleResetDemo}
              disabled={resetMutation.isPending}
              size="icon"
              variant="ghost"
              aria-label="Reset sandbox database mocks"
              className="w-full h-9 rounded-md border border-aether-ink text-pulse-cyan hover:text-white hover:bg-pulse-cyan/10 cursor-pointer"
            >
              {resetMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-pulse-cyan" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </Button>
          )}

          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            variant="ghost"
            size="icon"
            className={cn(
              "w-full h-9 rounded-md border border-aether-ink hover:bg-aether-slate/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer",
              isCollapsed ? "px-0" : "flex gap-2"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest font-space">Collapse Rail</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
