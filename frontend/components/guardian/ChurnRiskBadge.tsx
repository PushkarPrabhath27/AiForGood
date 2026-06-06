"use client";

import { TrendingDown, AlertCircle } from "lucide-react";

interface ChurnRiskBadgeProps {
  trend: "stable" | "declining" | "critical";
  cusumScore: number;
}

export function ChurnRiskBadge({ trend, cusumScore }: ChurnRiskBadgeProps) {
  if (trend === "stable") return null;

  const config = {
    declining: {
      icon: <TrendingDown className="w-2.5 h-2.5 text-white" />,
      bg: "bg-amber-500",
      label: `Engagement declining (CUSUM: ${cusumScore.toFixed(2)})`,
      glow: "shadow-amber-500/20",
    },
    critical: {
      icon: <AlertCircle className="w-2.5 h-2.5 text-white" />,
      bg: "bg-red-500",
      label: `Churn risk critical (CUSUM: ${cusumScore.toFixed(2)})`,
      glow: "shadow-red-500/20",
    },
  };

  const { icon, bg, label, glow } = config[trend];

  return (
    <div className="absolute -top-1 -right-1 group/tooltip z-20 select-none">
      {/* Risk Badge Icon */}
      <div
        className={`w-5 h-5 rounded-full ${bg} flex items-center justify-center shadow-lg ${glow} active:scale-90 transition-transform cursor-help`}
      >
        {icon}
      </div>

      {/* Tailwind Pure CSS Tooltip */}
      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/tooltip:block bg-slate-950/95 border border-slate-800 text-slate-200 text-[9px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="relative">
          {label}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
        </div>
      </div>
    </div>
  );
}
