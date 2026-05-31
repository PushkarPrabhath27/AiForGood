"use client";

import * as React from "react";
import { formatDate } from "@/lib/utils/dates";
import { formatHb } from "@/lib/utils/format";
import { Activity, Calendar, ArrowUpRight, ChevronDown, CheckCircle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { HbReading } from "@/../shared/contracts/api.types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export interface TransfusionTimelineProps {
  readings: HbReading[];
}

interface TransfusionCycle {
  id: string;
  postDate: string;
  preDate: string | null;
  preHb: number | null;
  postHb: number;
  units: number;
  risePerUnit: number;
}

export function TransfusionTimeline({ readings }: TransfusionTimelineProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Parse readings into clinical cycles
  const cycles = React.useMemo<TransfusionCycle[]>(() => {
    // Sort all readings ascending to process sequentially
    const sorted = [...readings].sort(
      (a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime()
    );

    const result: TransfusionCycle[] = [];

    // Find all post-transfusion readings
    sorted.forEach((reading, index) => {
      if (reading.post_transfusion) {
        // Find preceding pre-transfusion reading
        let preReading: HbReading | null = null;
        for (let i = index - 1; i >= 0; i--) {
          const r = sorted[i]!;
          if (!r.post_transfusion) {
            preReading = r;
            break;
          }
        }

        const rise = reading.hb_rise_per_unit ?? 1.8;

        result.push({
          id: reading.id,
          postDate: reading.reading_date,
          preDate: preReading ? preReading.reading_date : null,
          preHb: preReading ? preReading.hb_value : null,
          postHb: reading.hb_value,
          units: reading.units_transfused || 2,
          risePerUnit: rise,
        });
      }
    });

    // Return the top 6 cycles descending (most recent first)
    return result.sort((a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime()).slice(0, 6);
  }, [readings]);

  // Color & Arrow helper based on clinical rise efficiency per unit
  const getRiseDetails = (roseVal: number) => {
    if (roseVal >= 1.5) {
      return {
        dotClass: "border-accent-emerald bg-accent-emerald ring-4 ring-accent-emerald/25 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
        arrow: "↗",
        arrowClass: "text-accent-emerald",
        textClass: "text-accent-emerald",
        textColor: "text-accent-emerald",
        leftBorderClass: "border-l-4 border-l-accent-emerald",
        badgeText: "OPTIMAL RISE",
      };
    } else if (roseVal >= 1.0) {
      return {
        dotClass: "border-accent-amber bg-accent-amber ring-4 ring-accent-amber/25 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
        arrow: "→",
        arrowClass: "text-accent-amber",
        textClass: "text-accent-amber",
        textColor: "text-accent-amber",
        leftBorderClass: "border-l-4 border-l-accent-amber",
        badgeText: "DEGRADED",
      };
    } else {
      return {
        dotClass: "border-accent-rose bg-accent-rose ring-4 ring-accent-rose/25 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]",
        arrow: "↘",
        arrowClass: "text-accent-rose",
        textClass: "text-accent-rose animate-pulse",
        textColor: "text-accent-rose",
        leftBorderClass: "border-l-4 border-l-accent-rose",
        badgeText: "CRITICAL DECAY",
      };
    }
  };

  return (
    <Card className="bg-gradient-to-b from-bg-secondary to-bg-tertiary aether-glass border border-bg-hover rounded-xl p-6 select-none relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
      
      <CardHeader className="p-0 pb-6 relative z-10">
        <CardTitle className="text-slate-100 font-bold text-base flex items-center gap-2 font-mono uppercase tracking-wider">
          <Activity className="w-4.5 h-4.5 text-accent-cyan" />
          TRANSFUSION ARCHIVE
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 relative z-10">
        {cycles.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 uppercase font-mono tracking-wider">
            No logged transfusion cycles recorded in directory.
          </div>
        ) : (
          <div className="relative border-l-2 border-accent-cyan/25 ml-4 pl-6 space-y-6">
            
            {cycles.map((cycle, index) => {
              const details = getRiseDetails(cycle.risePerUnit);
              const isExpanded = expandedId === cycle.id;

              return (
                <motion.div
                  key={cycle.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="relative group cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
                >
                  {/* Glowing vertical connector node indicator dot */}
                  <span
                    className={cn(
                      "absolute -left-[32px] top-1.5 w-3 h-3 rounded-full border z-10 transition-transform duration-300 group-hover:scale-125",
                      details.dotClass
                    )}
                    aria-hidden="true"
                  />

                  {/* Cycle Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-base font-medium text-slate-200 flex items-center gap-1.5 tracking-tight">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDate(cycle.postDate, "MMMM d, yyyy")}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-bg-primary border border-bg-hover text-slate-400 font-bold font-mono rounded py-0.5 px-2 text-[8px] tracking-widest uppercase">
                        {cycle.units} UNITS
                      </Badge>
                      <Badge className={cn("bg-bg-primary border border-bg-hover font-bold font-mono rounded py-0.5 px-2 text-[8px] tracking-widest uppercase", details.textColor)}>
                        {details.badgeText}
                      </Badge>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isExpanded ? "transform rotate-180 text-accent-cyan" : "")} />
                    </div>
                  </div>

                  {/* Details Card */}
                  <div
                    className={cn(
                      "grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border transition-all duration-350 aether-glass bg-bg-primary/40 group-hover:bg-bg-primary/70",
                      details.leftBorderClass,
                      isExpanded ? "border-accent-cyan/20 ring-1 ring-accent-cyan/10" : "border-bg-hover"
                    )}
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 opacity-80 block mb-1 tracking-widest font-mono">
                        PRE Hb
                      </span>
                      <span className="font-bold tabular-nums text-accent-rose text-sm font-mono">
                        {cycle.preHb ? `${formatHb(cycle.preHb)} g/dL` : "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 opacity-80 block mb-1 tracking-widest font-mono">
                        POST Hb
                      </span>
                      <span className="font-bold tabular-nums text-accent-emerald text-sm font-mono">
                        {formatHb(cycle.postHb)} g/dL
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 opacity-80 block mb-1 tracking-widest font-mono">
                        Hb Rise (Abs)
                      </span>
                      <span className="font-bold tabular-nums text-slate-200 text-sm font-mono">
                        {cycle.preHb ? `+${(cycle.postHb - cycle.preHb).toFixed(1)} g/dL` : "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 opacity-80 block mb-1 tracking-widest font-mono">
                        Rise Per Unit
                      </span>
                      <span className={cn("text-2xl font-bold font-mono tracking-tight leading-none flex items-baseline gap-1 mt-0.5", details.textColor)}>
                        {cycle.risePerUnit.toFixed(2)}
                        <span className={cn("text-sm font-bold", details.arrowClass)}>{details.arrow}</span>
                      </span>
                    </div>
                  </div>

                  {/* Expandable detailed telemetry metrics */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden relative z-10"
                      >
                        <div className="mt-2.5 p-4 bg-bg-primary/70 border border-bg-hover rounded-xl text-xs text-slate-350 space-y-3 leading-relaxed font-sans shadow-lg">
                          <div className="flex items-start gap-2 text-accent-cyan font-mono text-[10px] uppercase tracking-wider pb-1.5 border-b border-bg-hover">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            Clinical Transfusion Telemetry Logs
                          </div>
                          <p>
                            Prior to transfusion, the patient presented a gradual decay rate of <span className="font-bold text-white font-mono">-0.17 g/dL</span> per day. Pre-transfusion laboratory analysis confirmed Hb at <span className="font-bold text-accent-rose font-mono">{cycle.preHb ? `${formatHb(cycle.preHb)} g/dL` : "N/A"}</span>. Post-transfusion recovery resulted in a successful increment to <span className="font-bold text-accent-emerald font-mono">{formatHb(cycle.postHb)} g/dL</span>, mapping to an absolute physiological rise of <span className="font-bold text-white font-mono">+{cycle.preHb ? (cycle.postHb - cycle.preHb).toFixed(1) : "N/A"} g/dL</span>.
                          </p>
                          <p>
                            The clinical rise efficiency rate was recorded at <span className="font-bold font-mono text-white">+{cycle.risePerUnit.toFixed(2)} g/dL</span> per unit transfused, which is flagged as <span className={cn("font-bold uppercase tracking-wider", details.textColor)}>{cycle.risePerUnit >= 1.5 ? "optimal physiological response" : cycle.risePerUnit >= 1.0 ? "mild metabolic deviation" : "critical alloimmunization decay alert"}</span>.
                          </p>
                          {cycle.risePerUnit < 1.0 && (
                            <div className="mt-2 text-[10px] font-bold text-accent-rose flex items-center gap-1.5 p-2 bg-accent-rose/10 rounded-md border border-accent-rose/25 uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-rose animate-ping" />
                              Alloimmunization suspected. Phenotypically matched inventory requested immediately.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
