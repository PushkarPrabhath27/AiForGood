"use client";

import * as React from "react";
import { motion as dMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Activity } from "lucide-react";
import type { TypeCoverage, HealthStatus, BloodGroup } from "@/../shared/contracts/api.types";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

export interface CityHealthScoreProps {
  score: number;
  status: HealthStatus;
  coverage: Record<BloodGroup, TypeCoverage>;
  lastOptimizedAt: string;
}

export function CityHealthScore({
  score = 78,
  status = "green",
  coverage,
  lastOptimizedAt,
}: CityHealthScoreProps) {
  // Determine gradient color mapping based on supply-chain thresholds
  const themeColor = score > 70 ? "#00f0ff" : score > 40 ? "#ffb703" : "#ff006e";
  const themeStatus = score > 70 ? "HEALTHY" : score > 40 ? "STRESSED" : "CRITICAL";

  // Parse optimized time to readable string
  const optimizedTimeString = React.useMemo(() => {
    try {
      return new Date(lastOptimizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase();
    } catch {
      return "00:00:00";
    }
  }, [lastOptimizedAt]);

  return (
    <Card className="bg-gradient-to-b from-aether-midnight to-aether-void aether-glass border border-pulse-cyan/15 rounded-xl overflow-hidden p-6 select-none shadow-2xl w-full relative">
      <div className="absolute inset-0 neural-mesh opacity-[0.01] pointer-events-none" />
      
      <CardContent className="p-0 space-y-6 relative z-10 font-mono">
        {/* Header Widget */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-pulse-cyan animate-pulse" />
            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">
              ICU Supply Monitor
            </span>
          </div>
          <span className="text-[8px] font-bold text-pulse-cyan uppercase tracking-widest bg-aether-void border border-pulse-cyan/20 px-2 py-0.5 rounded">
            Live updates
          </span>
        </div>

        {/* ICU Monitor-Style Vital Score */}
        <div className="flex items-end justify-between border-b border-aether-ink pb-5">
          <div className="relative flex items-baseline">
            <dMotion.div
              animate={score < 50 ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl font-black tabular-nums tracking-tighter leading-none font-space bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber bg-clip-text text-transparent"
            >
              {score}
            </dMotion.div>
            <span className="text-slate-500 text-sm font-bold ml-1 font-mono">/100</span>

            {/* Status badge with glow */}
            <div
              style={{ borderColor: themeColor, color: themeColor }}
              className={cn(
                "absolute -top-4 -right-14 px-2 py-0.5 rounded border text-[8px] font-bold tracking-widest uppercase bg-aether-void shadow-[0_0_8px_rgba(0,240,255,0.05)]",
                score < 50 && "animate-pulse"
              )}
            >
              {themeStatus}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[8px] font-bold text-slate-550 uppercase tracking-widest block mb-0.5">
              OR-Tools Matrix
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-350">
              {optimizedTimeString}
            </span>
          </div>
        </div>

        {/* Blood Type Coverage Breakdowns */}
        <div className="space-y-3">
          <h4 className="text-[9px] font-bold uppercase text-slate-450 tracking-widest flex items-center gap-1.5 leading-none">
            {score > 50 ? (
              <ShieldCheck className="w-3.5 h-3.5 text-pulse-emerald" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-pulse-magenta animate-bounce" />
            )}
            Aggregate Blood Group Reserves
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(coverage).map(([type, data]) => {
              const capDays = Math.min(14, data.days_covered);
              const fillPct = (capDays / 14) * 100;
              
              const progressColorClass = data.days_covered > 10 
                ? "bg-pulse-emerald shadow-[0_0_8px_rgba(6,255,165,0.8)]" 
                : data.days_covered > 5 
                ? "bg-pulse-amber shadow-[0_0_8px_rgba(255,183,3,0.8)]" 
                : "bg-pulse-magenta shadow-[0_0_8px_rgba(255,0,110,0.8)]";

              return (
                <div
                  key={type}
                  className="flex items-center gap-3 p-2.5 rounded bg-aether-void border border-aether-ink hover:border-pulse-cyan/10 transition-colors"
                >
                  <span className="text-xs font-bold text-white w-8 tracking-tight font-space">
                    {type}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-aether-slate overflow-hidden relative border border-aether-ink">
                    <dMotion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fillPct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={cn("h-full rounded-full", progressColorClass)}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold tabular-nums w-6 text-right font-mono">
                    {data.days_covered}D
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
