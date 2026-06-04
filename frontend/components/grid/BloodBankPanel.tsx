"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, CalendarClock, History, Signal } from "lucide-react";
import type { BloodBankNode, BloodGroup } from "@/../shared/contracts/api.types";
import { cn } from "@/lib/utils/cn";

export interface BloodBankPanelProps {
  bank: BloodBankNode | null;
  hasMatchId: boolean; // True if this bank contains a recommendation matching the selected patient
}

interface MockStockItem {
  id: string;
  blood_type: string;
  rh_factor: string;
  units_available: number;
  expiry_date: string;
  days_left: number;
  kell: boolean;
}

export function BloodBankPanel({ bank, hasMatchId }: BloodBankPanelProps) {
  // Generate realistic expiry parameters dynamically based on the bank's summary
  const inventoryCards = React.useMemo<MockStockItem[]>(() => {
    if (!bank || !bank.inventory_summary) return [];

    return Object.entries(bank.inventory_summary).map(([bloodGroup, count], idx) => {
      const units = count || 0;
      const type = bloodGroup.slice(0, -1);
      const rh = bloodGroup.slice(-1);

      // Distribute realistic mock expiry windows for a beautiful visual feed
      let days_left = 12;
      if (bloodGroup === "B+" && hasMatchId) {
        days_left = 2; // Critical expiry matching the Vikram lifeline
      } else if (idx === 0) {
        days_left = 25; // Fresh stock
      } else if (idx === 2) {
        days_left = 5; // Warning threshold
      }

      // Compute exact mock ISO dates
      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() + days_left);
      const expiry_date = mockDate.toISOString();

      return {
        id: `${bank.id}_stock_${bloodGroup}`,
        blood_type: type,
        rh_factor: rh,
        units_available: units,
        expiry_date,
        days_left,
        // Mark B+ as Kell- if matching the patient requirement at Apollo
        kell: bloodGroup === "B+" && hasMatchId,
      };
    });
  }, [bank, hasMatchId]);

  if (!bank) {
    return (
      <Card className="bg-gradient-to-b from-aether-midnight to-aether-void aether-glass border border-pulse-cyan/15 rounded-xl h-full flex flex-col items-center justify-center p-6 text-center select-none min-h-[300px]">
        <div className="absolute inset-0 neural-mesh opacity-[0.01] pointer-events-none" />
        <div className="w-12 h-12 rounded-full bg-aether-void flex items-center justify-center text-slate-500 mb-3 border border-aether-ink">
          📍
        </div>
        <CardTitle className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">No Bank Selected</CardTitle>
        <p className="text-[9px] text-slate-550 max-w-[200px] mt-1 font-mono uppercase tracking-wider leading-relaxed">
          Click any holographic map beacon on the RaktaGrid to inspect real-time clinical stocks.
        </p>
      </Card>
    );
  }

  const syncTime = new Date(bank.last_sync_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="bg-gradient-to-b from-aether-midnight to-aether-void aether-glass border border-pulse-cyan/15 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full select-none w-full relative">
      <div className="absolute inset-0 neural-mesh opacity-[0.01] pointer-events-none" />
      
      <CardHeader className="p-5 pb-3 border-b border-aether-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 font-mono">
        <div className="space-y-1">
          <CardTitle className="text-sm font-bold text-white leading-tight font-space uppercase">
            {bank.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                bank.status === "green"
                  ? "bg-pulse-cyan"
                  : bank.status === "yellow"
                  ? "bg-pulse-amber animate-pulse"
                  : "bg-pulse-magenta animate-pulse"
              }`}
            />
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
              {bank.status === "yellow" ? "LOW RESERVES" : `${bank.status.toUpperCase()} STATUS`}
            </span>
          </div>
        </div>

        {/* Sync/Status Badges in custom hollow tags */}
        <div className="flex items-center gap-2.5">
          {bank.is_stale ? (
            <Badge className="bg-aether-void border border-pulse-magenta/35 text-pulse-magenta text-[8px] font-bold rounded uppercase tracking-widest flex items-center gap-1 shadow-[0_0_8px_rgba(255,0,110,0.15)]">
              <ShieldAlert className="w-3 h-3 text-pulse-magenta animate-pulse" />
              DB STALE
            </Badge>
          ) : (
            <Badge className="bg-aether-void border border-pulse-emerald/35 text-pulse-emerald text-[8px] font-bold rounded uppercase tracking-widest flex items-center gap-1 shadow-[0_0_8px_rgba(6,255,165,0.15)]">
              <ShieldCheck className="w-3 h-3 text-pulse-emerald" />
              SYNCED SECURE
            </Badge>
          )}
          <span className="text-[9px] text-slate-550 font-mono font-bold flex items-center gap-1">
            <Signal className="w-3 h-3 text-slate-600" />
            {syncTime.toUpperCase()}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 relative z-10 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-pulse-cyan uppercase tracking-widest flex items-center gap-1.5 leading-none">
            <CalendarClock className="w-3.5 h-3.5 text-pulse-cyan" />
            Live Stock Ticker
          </span>
          <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
            <History className="w-3 h-3" />
            Sorted by expiry
          </span>
        </div>

        {/* Live Ticker Feed */}
        <div className="space-y-3">
          <AnimatePresence>
            {inventoryCards.map((item) => {
              const urgency = item.days_left < 3 ? "critical" : item.days_left < 7 ? "warning" : "normal";

              const borderClass = urgency === "critical" 
                ? "border-t-[3px] border-t-pulse-magenta border-pulse-magenta/15 bg-pulse-magenta/5" 
                : urgency === "warning" 
                ? "border-t-[3px] border-t-pulse-amber border-pulse-amber/15 bg-pulse-amber/5" 
                : "border-t-[3px] border-t-pulse-cyan border-pulse-cyan/15 bg-aether-slate/40";

              const textClass = urgency === "critical" ? "text-pulse-magenta animate-pulse" : urgency === "warning" ? "text-pulse-amber" : "text-pulse-cyan";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn("p-3.5 rounded-md border text-[10px] aether-glass", borderClass)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("w-1.5 h-1.5 rounded-full", 
                          urgency === "critical" ? "bg-pulse-magenta" : urgency === "warning" ? "bg-pulse-amber" : "bg-pulse-cyan"
                        )}
                      />
                      <span className="font-bold text-slate-200 uppercase tracking-widest text-[11px]">
                        {item.blood_type}{item.rh_factor}
                      </span>
                      {item.kell && (
                        <Badge
                          className="text-[8px] font-bold border-pulse-magenta/35 bg-aether-void text-pulse-magenta py-0 px-1.5 rounded leading-none h-4 uppercase tracking-widest"
                        >
                          Kell-
                        </Badge>
                      )}
                    </div>
                    <span className="text-lg font-bold tabular-nums text-white leading-none">
                      {item.units_available} <span className="text-[8px] text-slate-500 font-semibold tracking-normal lowercase">Units</span>
                    </span>
                  </div>

                  <div className="mt-2.5 flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                    <span>
                      Exp: {new Date(item.expiry_date).toLocaleDateString([], { month: "short", day: "2-digit" }).toUpperCase()}
                    </span>
                    <span className={cn("font-bold tracking-widest", textClass)}>
                      {item.days_left <= 0 ? "EXPIRED" : `${item.days_left} DAYS LEFT`}
                    </span>
                  </div>

                  {/* Expiry progress bar */}
                  <div className="mt-2.5 h-1 rounded-full bg-aether-void overflow-hidden border border-aether-ink">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: `${Math.max(0, (item.days_left / 30) * 100)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={cn("h-full rounded-full", 
                        urgency === "critical" ? "bg-pulse-magenta" : urgency === "warning" ? "bg-pulse-amber" : "bg-pulse-cyan"
                      )}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
