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
import { Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { HbReading, ForecastPoint } from "@/../shared/contracts/api.types";
import { priyaForecastPayload } from "@/lib/mocks/fixtures";

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
  React.useEffect(() => { setMounted(true); }, []);

  // Use fixture fallback if data is empty
  const safeHistorical = historical && historical.length > 0
    ? historical
    : priyaForecastPayload.historical_readings;
  const safeForecast = forecast && forecast.length > 0
    ? forecast
    : priyaForecastPayload.forecast_points;

  const filteredHistorical = React.useMemo(() => {
    if (timeframe === "ALL") return safeHistorical;
    const limitMonths = timeframe === "3M" ? 3 : 6;
    const cutoffDate = subMonths(new Date(2024, 9, 20), limitMonths);
    return safeHistorical.filter((r) => {
      try { return isAfter(parseISO(r.reading_date), cutoffDate); }
      catch { return false; }
    });
  }, [safeHistorical, timeframe]);

  const chartData = React.useMemo(() => {
    const sortedHist = [...filteredHistorical].sort(
      (a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime()
    );
    const histData = sortedHist.map((h) => ({
      dateStr: h.reading_date,
      displayDate: formatDate(h.reading_date, "MMM dd").toUpperCase(),
      hb_value: h.hb_value as number | null,
      hb_predicted: null as number | null,
      ci_lower: null as number | null,
      ci_upper: null as number | null,
      isPredicted: false,
    }));

    const sortedFore = [...safeForecast].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const foreData = sortedFore.map((f) => ({
      dateStr: f.date,
      displayDate: formatDate(f.date, "MMM dd").toUpperCase(),
      hb_value: null as number | null,
      hb_predicted: f.hb_predicted as number | null,
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
  }, [filteredHistorical, safeForecast]);

  const predictedCrossingPoint = React.useMemo(() => {
    const formattedPredDate = formatDate(predictedDate, "MMM dd").toUpperCase();
    const point = chartData.find((d) => d.displayDate === formattedPredDate);
    if (point && point.hb_predicted !== null) return { x: point.displayDate, y: point.hb_predicted };
    const crossing = chartData.find((d) => d.hb_predicted !== null && d.hb_predicted <= threshold);
    if (crossing && crossing.hb_predicted !== null) return { x: crossing.displayDate, y: crossing.hb_predicted };
    return null;
  }, [chartData, predictedDate, threshold]);

  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload[0]) {
      const payload = state.activePayload[0].payload;
      const isPredicted = !!payload.isPredicted;
      const hbVal = isPredicted ? payload.hb_predicted : payload.hb_value;
      if (hbVal !== null && hbVal !== undefined) {
        setSelectedPoint({ date: payload.dateStr, hb: hbVal, isPredicted });
      }
    }
  };

  if (!mounted) {
    return (
      <div
        className="rounded-xl p-6 min-h-[400px] flex flex-col justify-center items-center gap-3"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-cyan)" }} />
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
        >
          Hydrating Biometric Forecasts...
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 relative overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
    >
      <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-row items-center justify-between flex-wrap gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3
              className="text-sm font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-primary)" }}
            >
              HEMOGLOBIN DECAY TRAJECTORY
            </h3>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
              style={{
                background: "rgba(0, 180, 216, 0.06)",
                border: "1px solid rgba(0, 180, 216, 0.3)",
                color: "var(--accent-cyan)",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              ● PROPHET ENGINE v2.1
            </span>
          </div>

          {/* Legend row */}
          <div className="flex items-center gap-4 mt-2">
            {[
              { color: "var(--accent-crimson)", label: "Historical Hb", dash: false },
              { color: "var(--accent-cyan)", label: "NOOR Forecast", dash: true },
              { color: "rgba(0, 180, 216, 0.3)", label: "Confidence Band", dash: false },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {l.dash ? (
                    <svg width="14" height="4">
                      <line x1="0" y1="2" x2="14" y2="2" stroke={l.color} strokeWidth="2" strokeDasharray="3 2" />
                    </svg>
                  ) : (
                    <span className="w-3 h-2 rounded-sm" style={{ background: l.color }} />
                  )}
                </div>
                <span
                  className="text-[9px] font-bold"
                  style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
                >
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeframe toggles */}
        <div
          className="flex gap-1 p-1 rounded-md"
          style={{ background: "var(--bg-void)", border: "1px solid var(--bg-border)" }}
        >
          {(["3M", "6M", "ALL"] as Timeframe[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className="px-3.5 h-7 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                background: t === timeframe ? "rgba(230, 57, 70, 0.15)" : "transparent",
                color: t === timeframe ? "var(--accent-crimson)" : "var(--text-secondary)",
                border: t === timeframe ? "1px solid rgba(230, 57, 70, 0.4)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative z-10">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes dash-drift { to { stroke-dashoffset: -20; } }
          .dashed-forecast { animation: dash-drift 1.5s linear infinite; }
        ` }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={timeframe}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                onClick={handleChartClick}
                margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" opacity={0.6} />

                <XAxis
                  dataKey="displayDate"
                  stroke="var(--bg-border)"
                  tick={{ fill: "var(--text-secondary)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <defs>
                  <linearGradient id="colorHb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(220, 20, 60, 0.15)" stopOpacity={1}/>
                    <stop offset="95%" stopColor="rgba(220, 20, 60, 0)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis
                  domain={[5, 12]}
                  stroke="var(--bg-border)"
                  tick={{ fill: "var(--text-secondary)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]!.payload;
                      const isPred = !!data.isPredicted;
                      const val = isPred ? data.hb_predicted : data.hb_value;
                      return (
                        <div
                          className="p-3.5 rounded-lg shadow-2xl flex flex-col gap-1.5"
                          style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--bg-border)",
                            fontFamily: "var(--font-jetbrains-mono)",
                            fontSize: 10,
                          }}
                        >
                          <span
                            className="font-bold uppercase tracking-widest block"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {formatDate(data.dateStr, "MMM dd, yyyy").toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: isPred ? "var(--accent-cyan)" : "var(--accent-crimson)" }}
                            />
                            <span
                              className="text-xs font-bold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {formatHb(val)} g/dL
                            </span>
                            <span
                              className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: isPred ? "rgba(0,180,216,0.1)" : "rgba(220,20,60,0.1)",
                                color: isPred ? "var(--accent-cyan)" : "var(--accent-crimson)",
                                border: `1px solid ${isPred ? "rgba(0,180,216,0.3)" : "rgba(220,20,60,0.3)"}`,
                              }}
                            >
                              {isPred ? "PREDICTED" : "ACTUAL"}
                            </span>
                          </div>
                          {isPred && data.ci_lower && data.ci_upper && (
                            <span
                              className="text-[8px] font-bold mt-0.5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              CI: {data.ci_lower} – {data.ci_upper} g/dL
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Confidence band */}
                <Area
                  name="ci_bounds"
                  type="monotone"
                  dataKey="ci_upper"
                  stroke="none"
                  fill="rgba(0, 180, 216, 0.08)"
                  fillOpacity={1}
                  connectNulls
                  legendType="none"
                />
                <Area
                  name="ci_lower_fill"
                  type="monotone"
                  dataKey="ci_lower"
                  stroke="none"
                  fill="var(--bg-surface)"
                  fillOpacity={1}
                  connectNulls
                  legendType="none"
                />

                {/* Historical Hb Area */}
                <Area
                  name="Historical Area"
                  type="monotone"
                  dataKey="hb_value"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#colorHb)"
                  connectNulls
                  legendType="none"
                />

                {/* Historical Hb — solid crimson */}
                <Line
                  name="Historical Hb"
                  type="monotone"
                  dataKey="hb_value"
                  stroke="var(--accent-crimson)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "var(--accent-crimson)", strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: "var(--accent-crimson)", strokeWidth: 2, fill: "var(--bg-void)" }}
                  connectNulls
                  legendType="none"
                />

                {/* NOOR Forecast — dashed cyan */}
                <Line
                  name="NOOR Forecast"
                  type="monotone"
                  dataKey="hb_predicted"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  className="dashed-forecast"
                  dot={false}
                  activeDot={{ r: 5, stroke: "var(--accent-cyan)", strokeWidth: 2, fill: "var(--bg-void)" }}
                  connectNulls
                  legendType="none"
                />

                {/* Threshold 7.0 */}
                <ReferenceLine
                  y={threshold}
                  stroke="var(--accent-crimson)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  label={{
                    value: "THRESHOLD 7.0",
                    position: "insideTopRight",
                    fill: "var(--accent-crimson)",
                    fontSize: 9,
                    fontWeight: "bold",
                    fontFamily: "var(--font-jetbrains-mono)",
                  }}
                />

                {/* Predicted crossing vertical */}
                {predictedCrossingPoint && (
                  <ReferenceLine
                    x={predictedCrossingPoint.x}
                    stroke="var(--accent-amber)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `NOV 3`,
                      position: "insideTopLeft",
                      fill: "var(--accent-amber)",
                      fontSize: 9,
                      fontWeight: "bold",
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  />
                )}

                {/* Crossing dot */}
                {predictedCrossingPoint && (
                  <ReferenceDot
                    x={predictedCrossingPoint.x}
                    y={predictedCrossingPoint.y}
                    r={5}
                    fill="var(--accent-crimson)"
                    stroke="var(--bg-void)"
                    strokeWidth={2}
                    isFront
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        {/* Detail panel on click */}
        {selectedPoint && (
          <div
            className="mt-4 p-4 rounded-md flex gap-3 items-start animate-in slide-in-from-bottom-2 duration-300"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid rgba(0, 180, 216, 0.2)",
            }}
          >
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />
            <div className="space-y-1 flex-1">
              <h4
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
              >
                {selectedPoint.isPredicted ? "NOOR Clinical Prediction Node" : "Historical Lab Log Node"}
              </h4>
              <p
                className="text-[10px] leading-relaxed"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {selectedPoint.isPredicted
                  ? `Prophet models Priya's decay rate at -0.17 g/dL per day. Projected Hb: ${selectedPoint.hb} g/dL around ${formatDate(selectedPoint.date, "MMMM d, yyyy")}.`
                  : `Clinical lab record on ${formatDate(selectedPoint.date, "MMMM d, yyyy")}: ${selectedPoint.hb} g/dL.`}
              </p>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-[9px] font-bold uppercase tracking-widest pt-1 block"
                style={{ color: "var(--accent-crimson)", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
