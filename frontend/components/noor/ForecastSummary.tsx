"use client";

import * as React from "react";
import { CalendarDays, Percent } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export interface ForecastSummaryProps {
  predictedDate: string;
  confidenceLower: string;
  confidenceUpper: string;
  confidencePct: number;
  className?: string;
}

export function ForecastSummary({
  predictedDate = "2024-11-03",
  confidenceLower = "2024-11-01",
  confidenceUpper = "2024-11-05",
  confidencePct = 89,
  className,
}: ForecastSummaryProps) {
  // Compute countdown in days relative to Oct 20, 2024 (Today in demo)
  const today = new Date(2024, 9, 20); // Oct 20, 2024
  const pred = new Date(predictedDate);
  const diffTime = pred.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDateStr = formatDate(predictedDate, "MMMM d, yyyy");
  const formattedLower = formatDate(confidenceLower, "MMM d");
  const formattedUpper = formatDate(confidenceUpper, "MMM d");

  return (
    <div
      className={cn(
        "relative rounded-xl aether-glass border border-pulse-cyan/15 border-t-2 border-t-pulse-cyan p-6 overflow-hidden select-none",
        className
      )}
    >
      {/* Drifting background grid underneath */}
      <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        
        {/* Left Side: calendar icon + small monospace description */}
        <div className="flex gap-4 items-center flex-1">
          <div className="w-12 h-12 rounded-lg bg-aether-slate border border-pulse-cyan/20 flex items-center justify-center text-pulse-cyan flex-shrink-0 animate-pulse">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-pulse-cyan block font-mono">
              TRANSFUSION PREDICTED
            </span>
            {/* Space Grotesk date with gradient-ai fill */}
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber bg-clip-text text-transparent font-space uppercase leading-none">
              {formattedDateStr}
            </h2>
            
            {/* Confidence status & progress bar below */}
            <div className="space-y-1 max-w-xs">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider leading-none">
                {confidencePct}% Confidence · Safety: {formattedLower} – {formattedUpper}
              </p>
              <div className="w-full h-1 bg-aether-void border border-aether-ink rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pulse-cyan rounded-full shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: T-15 countdown feel in monospace magenta */}
        <div className="flex-shrink-0 flex items-center gap-2 lg:border-l lg:border-aether-ink lg:pl-8 lg:py-2">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-slate-500 block leading-none mb-1 font-mono tracking-widest">
              Time to Trigger
            </span>
            <span className="text-3xl font-bold tracking-tight text-pulse-magenta font-mono uppercase">
              T-{diffDays} Days
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
