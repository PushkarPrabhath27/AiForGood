"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/40 w-full mb-6",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm md:text-base text-slate-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          aria-label={action.label}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/20 active:scale-95 transition-all"
        >
          {action.icon && <span aria-hidden="true">{action.icon}</span>}
          {action.label}
        </Button>
      )}
    </div>
  );
}
