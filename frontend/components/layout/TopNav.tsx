"use client";

import * as React from "react";
import { Search, Bell, Menu, User, Settings, LogOut, Activity, HardDrive, ShieldAlert, Cpu } from "lucide-react";
import { Input } from "@/components/ui/input";
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

  // Search input query state
  const [searchVal, setSearchVal] = React.useState(searchParams?.get("search") || "");

  // Dropdown states
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  // Notifications state
  const [notifications, setNotifications] = React.useState([
    { id: 1, text: "Suresh Kumar confirmed donation eligibility", type: "guardian", read: false },
    { id: 2, text: "Vikram Reddy's B+ unit match approved", type: "match", read: false },
    { id: 3, text: "Apollo Blood Bank sync complete", type: "system", read: false },
  ]);

  // Derived unread count
  const unreadNotifications = React.useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Debounced search query URL updates
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (searchVal) {
          params.set("search", searchVal);
        } else {
          params.delete("search");
        }

        // Only redirect query param if on dashboard pages
        if (pathname === "/dashboard" || pathname === "/") {
          router.push(`${pathname}?${params.toString()}`);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchVal, pathname, router]);

  const handleLogOut = () => {
    localStorage.removeItem("raktasetu_session");
    toast.success("Coordinator session logged out successfully.");
    router.push("/login");
  };

  // Close dropdowns on outside clicks
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".relative-dropdown")) {
        setShowNotifications(false);
        setShowUserDropdown(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <header className="h-16 border-b border-aether-ink bg-aether-void/40 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 w-full flex-shrink-0 relative z-30 select-none">
      
      {/* Mobile Drawer Trigger */}
      <div className="flex items-center gap-3 md:hidden relative z-40">
        <Sheet>
          <SheetTrigger className="text-slate-400 hover:text-pulse-cyan hover:bg-aether-slate/40 p-2 rounded-lg flex items-center justify-center cursor-pointer" aria-label="Open navigation menu">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-aether-void border-r border-aether-ink w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access clinical and inventory dashboards.</SheetDescription>
            </SheetHeader>
            <Sidebar className="!flex w-full border-r-0" />
          </SheetContent>
        </Sheet>
        
        {/* Brand Name on Mobile */}
        <div className="flex items-center gap-1.5 font-space">
          <span className="w-5 h-5 rounded bg-aether-slate border border-pulse-cyan/20 flex items-center justify-center text-xs font-black text-white">🩸</span>
          <span className="font-bold text-sm text-white tracking-tight">RaktaSetu</span>
        </div>
      </div>

      {/* Desktop Search Center - Rethemed as dark pill with cyan focus edge glow */}
      <div className="hidden sm:flex items-center w-full max-w-xs relative z-40 relative-dropdown">
        <Search className="w-4 h-4 text-slate-500 absolute left-3" aria-hidden="true" />
        <Input
          type="search"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search patients by name or ID..."
          aria-label="Search patients"
          className="bg-aether-void/80 border border-aether-ink text-slate-100 placeholder-slate-500 pl-9 rounded-md focus:border-pulse-cyan focus-visible:ring-pulse-cyan/25 h-9 text-xs transition-all font-mono"
        />
      </div>

      {/* Right-aligned Navigation Controls */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto relative z-40">
        
        {/* Rethemed Pulsing AI badge */}
        <div 
          title="NOOR Engine is monitoring 2 patients"
          className="hidden sm:flex items-center gap-1.5 aether-glass border border-pulse-cyan/15 px-3.5 py-1.5 rounded-md text-[10px] font-bold text-pulse-cyan cursor-help hover:border-pulse-cyan/40 transition-all select-none hover:scale-[1.02] font-mono tracking-wider"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pulse-emerald opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pulse-emerald"></span>
          </span>
          ● NOOR ENGINE v2.1
        </div>

        {/* Notifications Button */}
        <div className="relative relative-dropdown">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${unreadNotifications} unread notifications`}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            className={cn(
              "text-slate-400 hover:text-pulse-cyan hover:bg-aether-slate/40 rounded-lg relative cursor-pointer",
              showNotifications && "bg-aether-slate/40 text-pulse-cyan"
            )}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-pulse-magenta border border-aether-void" />
            )}
          </Button>

          {/* Absolute glassmorphic notifications menu with cyan border top */}
          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 aether-glass border border-pulse-cyan/15 border-t-2 border-t-pulse-cyan rounded-md p-4 shadow-2xl z-50 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center pb-2 border-b border-aether-ink">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pulse-cyan font-mono">SYSTEM ALERTS</span>
                {unreadNotifications > 0 && (
                  <button 
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      toast.success("All notifications marked as read.");
                    }}
                    className="text-[9px] font-bold text-pulse-cyan/70 hover:text-pulse-cyan transition-colors font-mono uppercase tracking-wider"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.map((notif) => {
                  let IconComponent = Cpu;
                  if (notif.type === "guardian") IconComponent = User;
                  if (notif.type === "match") IconComponent = ShieldAlert;

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        toast.info(`Alert detail: "${notif.text}"`);
                      }}
                      className={cn(
                        "p-2.5 rounded-md border text-[10px] leading-snug cursor-pointer transition-all flex items-center justify-between gap-3 font-mono",
                        notif.read 
                          ? "bg-aether-void/30 border-aether-ink text-slate-500 hover:bg-aether-slate/20" 
                          : "bg-aether-slate/40 border-pulse-cyan/10 text-slate-200 hover:bg-aether-slate/60 font-semibold border-l-2 border-l-pulse-cyan"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent className={cn("w-3.5 h-3.5 flex-shrink-0", notif.read ? "text-slate-600" : "text-pulse-cyan")} />
                        <span className="truncate">{notif.text}</span>
                      </div>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pulse-cyan flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar custom dropdown with life-rose top border */}
        <div className="relative relative-dropdown flex items-center">
          <div 
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-3 border-l border-aether-ink cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-aether-slate border border-pulse-cyan/20 group-hover:border-pulse-cyan flex items-center justify-center font-bold text-xs text-pulse-cyan transition-all select-none shadow-md">
              SK
            </div>
            <span className="hidden lg:inline text-xs font-bold text-slate-300 group-hover:text-slate-100 transition-colors font-space">S. Kulkarni</span>
          </div>

          {/* User profile dropdown formatted in Aether styles */}
          {showUserDropdown && (
            <div className="absolute right-0 top-10 mt-2 w-48 aether-glass border border-pulse-cyan/15 border-t-2 border-t-life-rose rounded-md p-1.5 shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2.5 border-b border-aether-ink mb-1">
                <p className="text-[11px] font-bold text-white font-space">S. Kulkarni</p>
                <p className="text-[8px] text-pulse-cyan font-bold tracking-widest uppercase mt-1 font-mono">COORDINATOR</p>
              </div>
              
              <button 
                onClick={() => {
                  toast.success("Profile panel loaded (Demo mode).");
                  setShowUserDropdown(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-[10px] font-semibold text-slate-350 hover:text-white hover:bg-aether-slate/60 flex items-center gap-2 transition-all font-mono uppercase tracking-wider cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-pulse-cyan" />
                Profile
              </button>
              
              <button 
                onClick={() => {
                  toast.success("Clinical settings synced successfully.");
                  setShowUserDropdown(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-[10px] font-semibold text-slate-350 hover:text-white hover:bg-aether-slate/60 flex items-center gap-2 transition-all font-mono uppercase tracking-wider cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-pulse-cyan" />
                Settings
              </button>
              
              <button 
                onClick={handleLogOut}
                className="w-full text-left px-3 py-2.5 rounded-md text-[10px] font-bold text-pulse-magenta hover:bg-pulse-magenta/5 flex items-center gap-2 transition-all mt-1 border-t border-aether-ink/50 pt-2.5 font-mono uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-pulse-magenta" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
