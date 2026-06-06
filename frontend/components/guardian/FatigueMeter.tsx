"use client";

interface FatigueMeterProps {
  annual_donation_count: number;
  fatigue_ceiling: number;
  is_eligible: boolean;
  fatigue_rest_until: string | null;
}

export function FatigueMeter({
  annual_donation_count,
  fatigue_ceiling,
  is_eligible,
  fatigue_rest_until,
}: FatigueMeterProps) {
  const pct = Math.min(annual_donation_count / fatigue_ceiling, 1);
  const barColor = pct >= 1 ? "#ef4444" : pct >= 0.75 ? "#f59e0b" : "#10b981";
  const remaining = fatigue_ceiling - annual_donation_count;

  return (
    <div className="w-full mt-1.5 select-none font-mono">
      {/* Battery Container */}
      <div className="h-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-900/50">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex justify-between mt-1 items-center">
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
          {is_eligible
            ? `${remaining} left`
            : fatigue_rest_until
            ? `Rest till ${new Date(fatigue_rest_until).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}`
            : "Resting"}
        </span>
        <span className="text-[8px] font-bold" style={{ color: barColor }}>
          {annual_donation_count}/{fatigue_ceiling}
        </span>
      </div>
    </div>
  );
}
