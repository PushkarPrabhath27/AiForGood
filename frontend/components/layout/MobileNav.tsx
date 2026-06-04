"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Map } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "Patients",
      href: "/dashboard",
      icon: <Users className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/patient"),
    },
    {
      label: "RaktaGrid",
      href: "/dashboard/grid",
      icon: <Map className="w-5 h-5" />,
      active: pathname === "/dashboard/grid",
    },
  ];

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/80 flex items-center justify-around px-4 z-40 select-none pb-safe",
        className
      )}
    >
      {navItems.map((item, index) => {
        return (
          <Link
            key={index}
            href={item.href}
            aria-label={item.label}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
              item.active
                ? "text-rose-500 scale-105"
                : "text-slate-400 active:scale-95"
            )}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
