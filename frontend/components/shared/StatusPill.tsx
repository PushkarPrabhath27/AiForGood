"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type StatusType = "green" | "amber" | "red" | "blue" | "gray";

export interface StatusPillProps {
  status: StatusType;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  blue: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  gray: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const defaultIcons: Record<StatusType, React.ReactNode> = {
  green: <CheckCircle2 className="w-3.5 h-3.5" />,
  amber: <AlertTriangle className="w-3.5 h-3.5" />,
  red: <AlertCircle className="w-3.5 h-3.5" />,
  blue: <Info className="w-3.5 h-3.5" />,
  gray: <HelpCircle className="w-3.5 h-3.5" />,
};

export function StatusPill({
  status,
  label,
  icon,
  onClick,
  className,
}: StatusPillProps) {
  const isClickable = !!onClick;
  const activeIcon = icon ?? defaultIcons[status];

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Status: ${label}. Click to activate.` : `Status: ${label}`}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
        statusStyles[status],
        isClickable && "hover:bg-opacity-80 cursor-pointer active:scale-95 hover:scale-102",
        className
      )}
    >
      <span className="flex-shrink-0" aria-hidden="true">
        {activeIcon}
      </span>
      <span>{label}</span>
    </div>
  );
}
