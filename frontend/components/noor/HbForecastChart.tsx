"use client";

import * as React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceDot
} from "recharts";
import { parseISO, subMonths, isAfter } from "date-fns";
import { formatDate } from "@/lib/utils/dates";
import { formatHb } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info, HelpCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { HbReading, ForecastPoint } from "@/../shared/contracts/api.types";

export interface HbForecastChartProps {
  historical: HbReading[];
  forecast: ForecastPoint[];
  threshold: number;
  predictedDate: string;
}

type Timeframe = "3M" | "6M" | "ALL";

export function HbForecastChart({
  historical,
  forecast,
  threshold = 7.0,
  predictedDate = "2024-11-03",
}: HbForecastChartProps) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("3M");
  const [selectedPoint, setSelectedPoint] = React.useState<{
    date: string;
    hb: number;
    isPredicted: boolean;
  } | null>(null);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Filter historical records based on timeframe selector
  const filteredHistorical = React.useMemo(() => {
    if (timeframe === "ALL") return historical;

    const limitMonths = timeframe === "3M" ? 3 : 6;
    const cutoffDate = subMonths(new Date(2024, 9, 20), limitMonths); // Today: Oct 20, 2024

    return historical.filter((r) => {
      try {
        const rDate = parseISO(r.reading_date);
        return isAfter(rDate, cutoffDate);
      } catch {
        return false;
      }
    });
  }, [historical, timeframe]);

  // Format data for Recharts composed layout
  const chartData = React.useMemo(() => {
    const sortedHist = [...filteredHistorical].sort(
      (a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime()
    );

    const histData = sortedHist.map((h) => ({
      dateStr: h.reading_date,
      displayDate: formatDate(h.reading_date, "MMM dd").toUpperCase(),
      hb_value: h.hb_value as number | null,
      hb_predicted: null as number | null,
      ci_range: null as [number, number] | null,
      ci_lower: null as number | null,
      ci_upper: null as number | null,
      isPredicted: false,
    }));

    const sortedFore = [...forecast].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const foreData = sortedFore.map((f) => ({
      dateStr: f.date,
      displayDate: formatDate(f.date, "MMM dd").toUpperCase(),
      hb_value: null as number | null,
      hb_predicted: f.hb_predicted as number | null,
      ci_range: (f.ci_lower !== null && f.ci_upper !== null) ? [f.ci_lower, f.ci_upper] as [number, number] : null,
      ci_lower: f.ci_lower as number | null,
      ci_upper: f.ci_upper as number | null,
      isPredicted: true,
    }));

    // Connect seamlessly
    if (histData.length > 0 && foreData.length > 0 && foreData[0]) {
      const lastHist = histData[histData.length - 1]!;
      foreData[0].hb_value = lastHist.hb_value;
    }

    return [...histData, ...foreData];
  }, [filteredHistorical, forecast]);

  // Find coordinates for crossing annotation dot
  const predictedCrossingPoint = React.useMemo(() => {
    const formattedPredDate = formatDate(predictedDate, "MMM dd").toUpperCase();
    const point = chartData.find((d) => d.displayDate === formattedPredDate);
    if (point && point.hb_predicted !== null) {
      return {
        x: point.displayDate,
        y: point.hb_predicted,
      };
    }
    const crossing = chartData.find(
      (d) => d.hb_predicted !== null && d.hb_predicted <= threshold
    );
    if (crossing && crossing.hb_predicted !== null) {
      return {
        x: crossing.displayDate,
        y: crossing.hb_predicted,
      };
    }
    return null;
  }, [chartData, predictedDate, threshold]);

  // Handle graph node clicking
  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload[0]) {
      const payload = state.activePayload[0].payload;
      const isPredicted = !!payload.isPredicted;
      const hbVal = isPredicted ? payload.hb_predicted : payload.hb_value;

      if (hbVal !== null && hbVal !== undefined) {
        setSelectedPoint({
          date: payload.dateStr,
          hb: hbVal,
          isPredicted,
        });
      }
    }
  };

  // Loading skeleton during server compilation / hydration mounting
  if (!mounted || !historical || historical.length === 0) {
    return (
      <Card className="aether-glass border border-pulse-cyan/15 rounded-xl p-6 relative overflow-hidden select-none min-h-[400px] flex flex-col justify-between">
        <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="h-6 w-1/4 bg-aether-slate/60 animate-pulse rounded-lg" />
          <div className="flex gap-2">
            <div className="h-6 w-12 bg-aether-slate/60 animate-pulse rounded-lg" />
            <div className="h-6 w-16 bg-aether-slate/60 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 relative z-10 font-mono">
          <Loader2 className="w-8 h-8 animate-spin text-pulse-cyan" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Hydrating Biometric Forecasts...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="aether-glass border border-pulse-cyan/15 rounded-xl p-6 relative overflow-hidden select-none min-h-[400px]">
      
      {/* Drifting subtle neural mesh behind */}
      <div className="absolute inset-0 neural-mesh opacity-[0.03] pointer-events-none" />

      {/* Styled Forecast header */}
      <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between flex-wrap gap-4 relative z-10">
        <div>
          <CardTitle className="text-slate-100 font-bold text-base flex items-center gap-3 font-mono uppercase tracking-wider">
            HEMOGLOBIN DECAY TRAJECTORY
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-aether-void border border-pulse-cyan/35 text-pulse-cyan font-mono tracking-widest flex items-center gap-1 shadow-[0_0_8px_rgba(0,240,255,0.15)]">
              ● PROPHET ENGINE v2.1
            </span>
          </CardTitle>
        </div>

        {/* Rethemed Timeframe selectors */}
        <div className="flex gap-1 bg-aether-void p-1 rounded-md border border-aether-ink">
          {(["3M", "6M", "ALL"] as Timeframe[]).map((t) => (
            <Button
              key={t}
              size="sm"
              onClick={() => setTimeframe(t)}
              className={t === timeframe
                ? "bg-accent-cyan/10 border border-accent-cyan text-accent-cyan px-3.5 h-7 text-[10px] font-bold rounded-md hover:bg-accent-cyan/20 transition-all font-mono uppercase tracking-wider"
                : "bg-aether-slate/40 border border-transparent text-slate-400 hover:text-slate-200 px-3.5 h-7 text-[10px] font-bold rounded-md hover:bg-aether-slate/80 transition-all font-mono uppercase tracking-wider"
              }
            >
              {t}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0 relative z-10">
        
        {/* Custom styled animated forecast dashed line trick */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dash-drift {
            to {
              stroke-dashoffset: -20;
            }
          }
          .dashed-forecast {
            animation: dash-drift 1.5s linear infinite;
          }
        `}} />

        <AnimatePresence mode="wait">
          <motion.div
            key={timeframe}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={chartData}
                onClick={handleChartClick}
                margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  {/* Glowing neon SVG filters */}
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                
                <XAxis
                  dataKey="displayDate"
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  className="font-mono"
                />
                
                <YAxis
                  domain={[5, 12]}
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  className="font-mono"
                  tickFormatter={(val) => `${val}`}
                />
                
                {/* Custom glassmorphic tooltip with cyan border and monospace data */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]!.payload;
                      const isPred = !!data.isPredicted;
                      const val = isPred ? data.hb_predicted : data.hb_value;
                      return (
                        <div className="aether-glass border border-accent-cyan/20 p-3.5 rounded-lg shadow-2xl flex flex-col gap-1 font-mono text-[10px]">
                          <span className="font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                            {formatDate(data.dateStr, "PPPP").toUpperCase()}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isPred ? "bg-accent-cyan animate-pulse" : "bg-accent-blue"}`} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {formatHb(val)} g/dL
                            </span>
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded-md border uppercase font-extrabold tracking-widest",
                              isPred ? "bg-accent-cyan/5 border-accent-cyan/25 text-accent-cyan" : "bg-accent-blue/5 border-accent-blue/25 text-accent-blue"
                            )}>
                              {isPred ? "Predicted" : "Actual"}
                            </span>
                          </div>
                          {isPred && data.ci_lower && data.ci_upper && (
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">
                              Interval: {data.ci_lower} – {data.ci_upper} g/dL
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 9, color: "#94a3b8", paddingTop: 10, textTransform: "uppercase", fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.05em" }}
                  formatter={(value) => {
                    if (value === "hb_value") return <span className="text-slate-400 hover:text-white">Historical Hb</span>;
                    if (value === "hb_predicted") return <span className="text-slate-400 hover:text-white">Prophet Forecast</span>;
                    if (value === "ci_bounds") return <span className="text-slate-400 hover:text-white">80% Confidence Interval</span>;
                    return value;
                  }}
                />

                {/* Shaded Confidence Band - Translucent Blue */}
                <Area
                  name="ci_bounds"
                  type="monotone"
                  dataKey="ci_range"
                  stroke="none"
                  fill="#93c5fd"
                  fillOpacity={0.3}
                  connectNulls
                />

                {/* Historical solid Hb line - solid blue #2563eb */}
                <Line
                  name="hb_value"
                  type="monotone"
                  dataKey="hb_value"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: "#2563eb", strokeWidth: 0 }}
                  activeDot={{ r: 5.5, stroke: "#2563eb", strokeWidth: 1.5, fill: "#ffffff" }}
                  connectNulls
                />

                {/* Forecast projected Hb line - dashed blue #3b82f6 */}
                <Line
                  name="hb_predicted"
                  type="monotone"
                  dataKey="hb_predicted"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  className="dashed-forecast"
                  dot={false}
                  activeDot={{ r: 5.5, stroke: "#3b82f6", strokeWidth: 1.5, fill: "#ffffff" }}
                  connectNulls
                />

                {/* Transfusion safety reference line - red threshold at 7.0 g/dL */}
                <ReferenceLine
                  y={threshold}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: "TRANSFUSION THRESHOLD (7.0 g/dL)",
                    position: "top",
                    fill: "#ef4444",
                    fontSize: 8,
                    fontWeight: "bold",
                    fontFamily: "var(--font-jetbrains-mono)",
                    letterSpacing: "0.05em",
                  }}
                />

                {/* Dynamic Predicted Crossing vertical annotation */}
                {predictedCrossingPoint && (
                  <ReferenceLine
                    x={predictedCrossingPoint.x}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: `CROSSING: ${predictedCrossingPoint.x}`,
                      position: "insideTopLeft",
                      fill: "#ef4444",
                      fontSize: 8,
                      fontWeight: "bold",
                      fontFamily: "var(--font-jetbrains-mono)",
                      letterSpacing: "0.05em",
                    }}
                  />
                )}

                {/* Crossing Dot Flag */}
                {predictedCrossingPoint && (
                  <ReferenceDot
                    x={predictedCrossingPoint.x}
                    y={predictedCrossingPoint.y}
                    r={5}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    isFront
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        {/* Detailed Explanation Panel triggered on Node click */}
        {selectedPoint && (
          <div className="mt-4 p-4 rounded-md aether-glass border border-accent-cyan/15 flex gap-3 items-start animate-in slide-in-from-bottom-2 duration-300 relative z-10 font-mono">
            <Info className="w-5 h-5 text-accent-cyan mt-0.5 flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <h4 className="text-[10px] font-bold text-accent-cyan uppercase tracking-wider">
                {selectedPoint.isPredicted ? "NOOR Clinical Prediction Node" : "Historical Lab Log Node"}
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider">
                {selectedPoint.isPredicted
                  ? `Prophet models Priya's decay rate at -0.17 g/dL per day. Projected Hb level reaches ${selectedPoint.hb} g/dL around ${formatDate(selectedPoint.date, "MMMM d, yyyy")}.`
                  : `Actual clinical lab hemoglobin record saved on ${formatDate(selectedPoint.date, "MMMM d, yyyy")} was logged at ${selectedPoint.hb} g/dL.`}
              </p>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-[9px] font-bold text-accent-rose hover:text-white uppercase tracking-widest pt-1 block cursor-pointer"
              >
                Close detail panel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
