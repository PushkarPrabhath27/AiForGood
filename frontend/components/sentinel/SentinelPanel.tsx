"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { SentinelStatus, CaregiverCheckin } from "@/types";
import { motion } from "framer-motion";
import { Activity, Mic, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface SentinelPanelProps {
  patientId: string;
}

export function SentinelPanel({ patientId }: SentinelPanelProps) {
  const { data: sentinel, isLoading, isError, refetch } = useQuery({
    queryKey: ["sentinel", patientId],
    queryFn: () => apiGet<SentinelStatus>(`/api/v1/sentinel/${patientId}`),
    refetchInterval: 60_000, // refresh every minute
  });

  if (isLoading) return <SentinelSkeleton />;

  if (isError || !sentinel) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-xs text-red-400">Failed to establish caregiver connection.</p>
        <button
          onClick={() => refetch()}
          className="text-[10px] font-bold uppercase tracking-widest text-red-450 hover:text-red-400 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry Connection
        </button>
      </div>
    );
  }

  // Determine colors based on sentinel_score
  const scoreColor =
    sentinel.sentinel_score > 65
      ? "text-red-400"
      : sentinel.sentinel_score > 35
      ? "text-amber-400"
      : "text-emerald-400";

  const borderColor =
    sentinel.sentinel_score > 65
      ? "border-red-500/50 shadow-red-500/10"
      : sentinel.sentinel_score > 35
      ? "border-amber-500/50 shadow-amber-500/10"
      : "border-slate-800";

  return (
    <motion.div
      className={`rounded-xl border bg-[#0d0d15] p-5 shadow-lg relative overflow-hidden transition-all duration-500 ${borderColor}`}
      animate={sentinel.alert_active ? { borderColor: ["#ef4444", "#991b1b", "#ef4444"] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      {/* Background Glow */}
      {sentinel.alert_active && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Sentinel Monitor
            </h4>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
              Caregiver Check-in
            </p>
          </div>
        </div>
        <SentinelScoreGauge score={sentinel.sentinel_score} />
      </div>

      {sentinel.last_checkin ? (
        <LastCheckinCard checkin={sentinel.last_checkin} />
      ) : (
        <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 text-center">
          <p className="text-[10px] text-slate-500 font-medium">No check-in signals logged this cycle.</p>
        </div>
      )}

      {sentinel.alert_active && sentinel.recommended_action && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-[10px] font-bold text-red-400 uppercase tracking-wider font-mono">
              Sentinel Alert Active
            </h5>
            <p className="text-[10px] text-red-350 leading-relaxed mt-1 font-medium">
              {sentinel.recommended_action}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function SentinelScoreGauge({ score }: { score: number }) {
  const radius = 20;
  const circumference = Math.PI * radius; // Semi-circle arc
  const offset = circumference - (score / 100) * circumference;
  const color = score > 65 ? "#ef4444" : score > 35 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative w-16 h-10 flex items-end justify-center select-none">
      <svg viewBox="0 0 48 28" className="w-full h-full">
        {/* Background Arc */}
        <path
          d="M 4 24 A 20 20 0 0 1 44 24"
          fill="none"
          stroke="#181825"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Foreground Value Arc */}
        <path
          d="M 4 24 A 20 20 0 0 1 44 24"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
        <span className="text-sm font-black tracking-tight" style={{ color }}>
          {score}
        </span>
        <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
          Score
        </span>
      </div>
    </div>
  );
}

function LastCheckinCard({ checkin }: { checkin: CaregiverCheckin }) {
  const activityIcons = {
    normal: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    reduced: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
    very_low: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
  };

  const isVoice = checkin.language_detected && checkin.language_detected !== "en";

  return (
    <div className="bg-[#050508] border border-slate-800/60 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isVoice && <Mic className="w-3.5 h-3.5 text-amber-400" />}
          <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest font-mono">
            {isVoice ? `Voice note (${checkin.language_detected.toUpperCase()})` : "Text response"}
          </span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono">
          {format(new Date(checkin.checkin_date), "MMM d, h:mm a")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Activity Level
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {activityIcons[checkin.activity_level]}
            <span className="text-[10px] text-slate-300 font-bold capitalize">
              {checkin.activity_level.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Caregiver Concern
          </span>
          <span
            className={`text-[10px] font-bold capitalize mt-0.5 ${
              checkin.caregiver_concern_level === "high"
                ? "text-red-400"
                : checkin.caregiver_concern_level === "mild"
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {checkin.caregiver_concern_level}
          </span>
        </div>
      </div>

      {checkin.fatigue_reported && (
        <div className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[9px] text-amber-400 font-bold uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>Fatigue symptoms reported by caregiver</span>
        </div>
      )}
    </div>
  );
}

function SentinelSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d0d15] p-5 animate-pulse select-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-lg" />
          <div className="space-y-1">
            <div className="h-3 w-24 bg-slate-900 rounded" />
            <div className="h-2 w-16 bg-slate-900 rounded" />
          </div>
        </div>
        <div className="w-16 h-10 bg-slate-900 rounded-lg" />
      </div>
      <div className="h-24 bg-slate-950/40 rounded-xl" />
    </div>
  );
}
