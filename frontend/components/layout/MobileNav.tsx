"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Network, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "OVERVIEW",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "PATIENTS",
      href: "/dashboard",
      icon: <Users className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/patient"),
    },
    {
      label: "GRID",
      href: "/dashboard/grid",
      icon: <Network className="w-5 h-5" />,
      active: pathname === "/dashboard/grid",
    },
    {
      label: "ADMIN",
      href: "/dashboard/admin",
      icon: <ShieldAlert className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/admin"),
    },
  ];

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 h-16 backdrop-blur-xl border-t flex items-center justify-around px-4 z-40 select-none",
        className
      )}
      style={{
        background: "rgba(10, 10, 15, 0.9)",
        borderColor: "var(--bg-border)",
      }}
    >
      {navItems.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          aria-label={item.label}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
            item.active ? "scale-105" : "active:scale-95"
          )}
          style={{
            color: item.active ? "var(--accent-crimson)" : "var(--text-secondary)",
            filter: item.active ? "drop-shadow(0 0 6px rgba(230,57,70,0.5))" : "none",
          }}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
