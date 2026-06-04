"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 min-h-[350px] bg-slate-900/30 border border-slate-800/60 rounded-3xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300",
        className
      )}
    >
      {/* Sleek inline heart-pulse SVG icon with customized animations */}
      <div className="w-16 h-16 rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-8 h-8 animate-pulse text-rose-500"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 10.5h1.5l1.5-3 1.5 6 1.5-3H16"
            className="stroke-rose-400"
          />
        </svg>
      </div>

      <h3 className="text-xl font-extrabold tracking-tight text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          aria-label={action.label}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 px-5 py-2 rounded-xl border border-rose-500/20 active:scale-95 transition-all"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
