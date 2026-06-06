"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { BloodWeatherForecast } from "@/types";
import { addWeeks, format, startOfWeek } from "date-fns";
import { Cloud, CloudRain, Sun, CloudLightning } from "lucide-react";

interface BloodWeatherPanelProps {
  cityCode: string;
}

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const WEEKS = [0, 1, 2, 3];

interface SeveritySetting {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

const SEVERITY_CONFIG: Record<"surplus" | "balanced" | "shortage" | "critical", SeveritySetting> = {
  surplus: {
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    text: "text-emerald-400",
    icon: <Sun className="w-3.5 h-3.5" />,
  },
  balanced: {
    bg: "bg-slate-800/40 hover:bg-slate-800/60",
    border: "border-slate-800 hover:border-slate-700",
    text: "text-slate-400",
    icon: <Cloud className="w-3.5 h-3.5" />,
  },
  shortage: {
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/20 hover:border-amber-500/40",
    text: "text-amber-400",
    icon: <CloudRain className="w-3.5 h-3.5" />,
  },
  critical: {
    bg: "bg-rose-500/10 hover:bg-rose-500/20",
    border: "border-rose-500/20 hover:border-rose-500/45",
    text: "text-rose-400",
    icon: <CloudLightning className="w-3.5 h-3.5" />,
    pulse: true,
  },
};

export function BloodWeatherPanel({ cityCode }: BloodWeatherPanelProps) {
  const { data: forecasts = [], isLoading } = useQuery<BloodWeatherForecast[]>({
    queryKey: ["blood-weather", cityCode],
    queryFn: () => apiGet<BloodWeatherForecast[]>(`/api/v1/weather/${cityCode}`),
    refetchInterval: 300000, // 5 minutes
  });

  // Build grid: blood_type -> week -> forecast
  const grid = React.useMemo(() => {
    const tempGrid: Record<string, Record<number, BloodWeatherForecast | null>> = {};
    BLOOD_TYPES.forEach((bt) => {
      const row: Record<number, BloodWeatherForecast | null> = {};
      WEEKS.forEach((w) => {
        row[w] = null;
      });
      tempGrid[bt] = row;
    });

    forecasts.forEach((f) => {
      const weekIndex = WEEKS.findIndex(
        (w) =>
          format(addWeeks(startOfWeek(new Date()), w), "yyyy-MM-dd") === f.forecast_week_start
      );
      const row = tempGrid[f.blood_type];
      if (weekIndex >= 0 && row) {
        row[weekIndex] = f;
      }
    });

    return tempGrid;
  }, [forecasts]);

  const weekLabels = React.useMemo(() => {
    return WEEKS.map((w) => {
      if (w === 0) return "This Week";
      if (w === 1) return "Next Week";
      return format(addWeeks(new Date(), w), "MMM d");
    });
  }, []);

  return (
    <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 select-none">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display">
            Blood Weather Forecast
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            30-day city-wide supply/demand outlook · Metro Area ({cityCode})
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[10px] font-bold tracking-wider uppercase text-slate-450 font-mono">
          {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1 rounded-full border border-slate-850">
              <span className={v.text}>{v.icon}</span>
              <span>{k}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-5 gap-1.5 animate-pulse">
          {Array.from({ length: 45 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-900 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-850">
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 pr-4 w-12 font-mono">
                  Type
                </th>
                {weekLabels.map((label, idx) => (
                  <th
                    key={idx}
                    className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 px-2 font-mono"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BLOOD_TYPES.map((bt) => (
                <tr key={bt} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20 transition-colors">
                  <td className="text-slate-300 font-mono font-bold text-xs py-2.5 pr-4 select-none">
                    {bt}
                  </td>
                  {WEEKS.map((w) => {
                    const f = grid[bt]?.[w];
                    const severity = f?.gap_severity ?? "balanced";
                    const cfg = SEVERITY_CONFIG[severity];
                    
                    return (
                      <td key={w} className="px-2 py-1.5">
                        <div className="relative group flex items-center justify-center">
                          <div
                            className={`
                              w-full h-9 rounded-xl border flex items-center justify-center transition-all duration-300 cursor-help
                              ${cfg.bg} ${cfg.border}
                              ${cfg.pulse ? "animate-pulse" : ""}
                            `}
                          >
                            <span className={cfg.text}>{cfg.icon}</span>
                          </div>

                          {/* Custom Premium CSS Tooltip */}
                          {f && (
                            <div className="absolute bottom-full mb-2.5 hidden group-hover:block bg-[#0b0b12] border border-slate-800 text-slate-200 text-xs p-3 rounded-2xl whitespace-nowrap shadow-2xl z-40 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-200">
                              <div className="space-y-1 font-sans">
                                <p className="font-extrabold text-slate-200 text-xs">
                                  {bt} · Week of {format(new Date(f.forecast_week_start), "MMM d")}
                                </p>
                                <div className="h-[1px] bg-slate-800 my-1.5" />
                                <div className="flex justify-between gap-6">
                                  <span className="text-slate-500 font-medium">Demand:</span>
                                  <span className="font-mono font-bold text-slate-300">{f.predicted_demand_units} units</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-slate-500 font-medium">Supply:</span>
                                  <span className="font-mono font-bold text-slate-300">{f.current_supply_units} units</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-slate-500 font-medium">Net Gap:</span>
                                  <span
                                    className={`font-mono font-bold ${
                                      f.gap_units > 0 ? "text-rose-450" : "text-emerald-450"
                                    }`}
                                  >
                                    {f.gap_units > 0
                                      ? `+${f.gap_units} units shortage`
                                      : `${Math.abs(f.gap_units)} units surplus`}
                                  </span>
                                </div>
                              </div>
                              {/* Tooltip Arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0b0b12]" />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
