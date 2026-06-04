"use client";

import * as React from "react";
import { CalendarDays, TrendingDown, Percent } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";

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
  const today = new Date(2024, 9, 20);
  const pred = new Date(predictedDate);
  const diffDays = Math.ceil((pred.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const stats = [
    {
      icon: <CalendarDays className="w-7 h-7" />,
      value: formatDate(predictedDate, "MMM dd").toUpperCase(),
      label: "PREDICTED DATE",
      color: "var(--accent-crimson)",
      glow: "rgba(230, 57, 70, 0.2)",
    },
    {
      icon: <TrendingDown className="w-7 h-7" />,
      value: `T-${diffDays}`,
      label: "DAYS REMAINING",
      color: diffDays <= 7 ? "var(--accent-crimson)" : diffDays <= 14 ? "var(--accent-amber)" : "var(--accent-emerald)",
      glow: diffDays <= 14 ? "rgba(230, 57, 70, 0.12)" : "rgba(82, 183, 136, 0.12)",
    },
    {
      icon: <Percent className="w-7 h-7" />,
      value: `${confidencePct}%`,
      label: "CONFIDENCE",
      color: "var(--accent-cyan)",
      glow: "rgba(0, 180, 216, 0.12)",
    },
    {
      icon: <CalendarDays className="w-7 h-7" />,
      value: `${formatDate(confidenceLower, "MMM dd")} – ${formatDate(confidenceUpper, "MMM dd")}`,
      label: "CONFIDENCE RANGE",
      color: "var(--accent-violet)",
      glow: "rgba(123, 94, 167, 0.12)",
      small: true,
    },
  ];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ${className ?? ""}`}>
      {stats.map((s, i) => (
        <div
          key={i}
          className="relative rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] cursor-default group"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${s.color}40`;
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${s.glow}`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--bg-border)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          }}
        >
          {/* Icon */}
          <div className="mb-3" style={{ color: s.color, opacity: 0.8 }}>
            {s.icon}
          </div>

          {/* Value */}
          <div
            className={`font-bold leading-none mb-1.5 ${s.small ? "text-lg" : "text-2xl"}`}
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              color: s.color,
            }}
          >
            {s.value}
          </div>

          {/* Label */}
          <div
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              color: "var(--text-secondary)",
            }}
          >
            {s.label}
          </div>

          {/* Bottom accent bar on hover */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: s.color }}
          />
        </div>
      ))}
    </div>
  );
}
