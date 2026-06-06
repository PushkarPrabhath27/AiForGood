"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { getChurnRisk, getCrossCompatibility } from "@/lib/api/admin";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Users, Activity, ShieldAlert, Map, Heart, AlertTriangle,
  CloudLightning, ChevronRight, TrendingUp, TrendingDown,
  Droplets, UserX, GitMerge, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AdminSummaryData {
  total_patients: number;
  total_guardians: number;
  total_blood_banks: number;
  city_health_score_history: number[];
  churn_risk_count: number;
  fatigue_ceiling_count: number;
  active_sentinel_alerts: number;
  critical_weather_weeks: number;
}

const bloodTypeBadge = (bt: string) => {
  const colors: Record<string, string> = {
    "O+": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "O-": "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    "A+": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "A-": "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    "B+": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "B-": "bg-amber-500/10 text-amber-300 border-amber-500/20",
    "AB+": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "AB-": "bg-purple-500/10 text-purple-300 border-purple-500/20",
  };
  return colors[bt] || "bg-slate-800 text-slate-400 border-slate-700";
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-black text-emerald-400 font-mono mt-1">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function AdminOverviewPage() {
  const { data: summary, isLoading, error } = useQuery<AdminSummaryData>({
    queryKey: ["admin-summary"],
    queryFn: () => apiGet<AdminSummaryData>("/admin/summary"),
    refetchInterval: 30000,
  });

  const { data: churnRiskData, isLoading: churnLoading } = useQuery({
    queryKey: ["admin-churn-risk"],
    queryFn: () => getChurnRisk(),
    refetchInterval: 30000,
  });

  const { data: compatData, isLoading: compatLoading } = useQuery({
    queryKey: ["admin-cross-compat"],
    queryFn: () => getCrossCompatibility(),
    refetchInterval: 30000,
  });

  const churnGuardians = churnRiskData?.data || [];
  const compatMatches = compatData?.data || [];

  const chartData = React.useMemo(() => {
    if (!summary?.city_health_score_history) return [];
    return summary.city_health_score_history.map((score, index) => ({
      day: `D-${29 - index}`,
      score,
    }));
  }, [summary]);

  const currentScore = chartData.length > 0 ? chartData[chartData.length - 1].score : 0;
  const prevScore = chartData.length > 1 ? chartData[chartData.length - 2].score : 0;
  const scoreTrend = currentScore - prevScore;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 w-48 bg-slate-900 rounded-xl mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-slate-900 rounded-2xl" />
          <div className="h-28 bg-slate-900 rounded-2xl" />
          <div className="h-28 bg-slate-900 rounded-2xl" />
        </div>
        <div className="h-72 bg-slate-900 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 rounded-2xl" />
          <div className="h-80 bg-slate-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-rose-400 mb-2">
          <ShieldAlert className="w-5 h-5" />
          <h4 className="text-sm font-bold uppercase tracking-wider font-mono">Admin Database Offline</h4>
        </div>
        <p className="text-xs text-rose-350 font-medium">
          Failed to establish coordinator sync with index services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            Administrative Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            System Operations &middot; Clinical KPIs &amp; Resource Auditing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/grief-protocol">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider h-10 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              Grief Protocol Log
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-xl flex items-center gap-4 hover:border-slate-800 transition-all">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
            <Users className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Total Enrolled Patients</p>
            <h3 className="text-2xl font-black text-slate-200 mt-0.5 font-mono">{summary.total_patients}</h3>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-xl flex items-center gap-4 hover:border-slate-800 transition-all">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Secured Living Guardians</p>
            <h3 className="text-2xl font-black text-slate-200 mt-0.5 font-mono">{summary.total_guardians}</h3>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-xl flex items-center gap-4 hover:border-slate-800 transition-all">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
            <Map className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Connected Blood Banks</p>
            <h3 className="text-2xl font-black text-slate-200 mt-0.5 font-mono">{summary.total_blood_banks}</h3>
          </div>
        </div>
      </div>

      {/* City Health Score Trend */}
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              City Health Score Trend &mdash; 30 Days
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Hyderabad Metro Area aggregate donor-to-patient alignment index
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-full font-bold font-mono">
            <span className="text-slate-400">Current:</span>
            <span className="text-emerald-400 text-base">{currentScore}</span>
            <span className={scoreTrend >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {scoreTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 inline" />}
              {scoreTrend >= 0 ? "+" : ""}{scoreTrend}
            </span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: "#475569", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                domain={[60, 90]}
                tick={{ fill: "#475569", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#334155", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#00ff88"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreGlow)"
                dot={false}
                activeDot={{ r: 4, fill: "#00ff88", stroke: "#0B0F1F", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Churn Prediction */}
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-400" />
              Churn Prediction &mdash; At-Risk Guardians
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              CUSUM-based engagement deterioration detection with predicted churn dates
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full font-bold font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-400">{summary.churn_risk_count} Critical</span>
          </div>
        </div>

        {churnLoading ? (
          <div className="animate-pulse h-40 bg-slate-900 rounded-2xl" />
        ) : churnGuardians.length === 0 ? (
          <div className="rounded-2xl border border-slate-850 bg-slate-950/30 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider">All guardians are stable</p>
            <p className="text-xs text-slate-500 mt-1">No critical churn risks detected in the network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {churnGuardians.map((g: any) => {
              const barFill = g.cusum_score > 0.7 ? "#dc143c" : g.cusum_score > 0.4 ? "#ffb347" : "#00ff88";
              return (
                <div key={g.guardian_id} className="rounded-2xl border border-slate-850 bg-slate-950/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                        <UserX className="w-4 h-4 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{g.guardian_name}</p>
                        <p className="text-[10px] font-mono text-slate-500">Guardian for {g.patient_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono uppercase tracking-wider"
                        style={{
                          background: g.engagement_trend === "critical" ? "rgba(220,20,60,0.15)" : "rgba(255,179,71,0.15)",
                          color: g.engagement_trend === "critical" ? "#dc143c" : "#ffb347",
                          borderColor: g.engagement_trend === "critical" ? "rgba(220,20,60,0.3)" : "rgba(255,179,71,0.3)",
                        }}>
                        {g.engagement_trend}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">CUSUM Score</span>
                      <span className="text-slate-300 font-bold">{(g.cusum_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.cusum_score * 100}%`, background: barFill }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Predicted Churn</span>
                      <span className={g.predicted_churn_date ? "text-rose-400 font-bold" : "text-slate-500"}>
                        {g.predicted_churn_date ? new Date(g.predicted_churn_date).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-mono text-slate-500">
                      {g.reengagement_attempted ? "Re-engagement sent" : "No re-engagement yet"}
                      {g.reengagement_sent_at ? ` (${new Date(g.reengagement_sent_at).toLocaleDateString()})` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cross Compatibility */}
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-cyan-400" />
              Cross-Compatibility Matching
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Blood type compatibility mapping across donor-patient pairs in the RaktaGrid network
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full font-bold font-mono">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400">{compatMatches.length} Matches</span>
          </div>
        </div>

        {compatLoading ? (
          <div className="animate-pulse h-40 bg-slate-900 rounded-2xl" />
        ) : compatMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-850 bg-slate-950/30 p-8 text-center">
            <p className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider">No matches available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 pr-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Donor</th>
                  <th className="pb-3 pr-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Blood</th>
                  <th className="pb-3 pr-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Patient</th>
                  <th className="pb-3 pr-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Blood</th>
                  <th className="pb-3 pr-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Compat</th>
                  <th className="pb-3 pr-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Dist</th>
                  <th className="pb-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Action</th>
                </tr>
              </thead>
              <tbody>
                {compatMatches.slice(0, 12).map((m: any, idx: number) => {
                  const compatPct = m.compatibility_score;
                  const compatColor = compatPct === 100 ? "#00ff88" : compatPct >= 80 ? "#ffb347" : "#dc143c";
                  return (
                    <tr key={idx} className="border-b border-slate-850/50 hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 pr-4">
                        <span className="text-xs font-bold text-slate-200">{m.donor_name}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${bloodTypeBadge(m.blood_type)}`}>
                          {m.blood_type}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-xs text-slate-300">{m.patient_name}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${bloodTypeBadge(m.patient_blood_type)}`}>
                          {m.patient_blood_type}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${compatPct}%`, background: compatColor }} />
                          </div>
                          <span className="text-[11px] font-bold font-mono" style={{ color: compatColor }}>{compatPct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="text-[10px] font-mono text-slate-400">{m.distance_km} km</span>
                      </td>
                      <td className="py-3.5">
                        <span className="text-[9px] text-slate-400 font-medium leading-tight block max-w-[200px]">
                          {m.recommended_action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monitor Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Guardian Network Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Churn Risk Alerts</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-rose-450 font-mono">{summary.churn_risk_count}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/20 font-mono">High CUSUM</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Fatigued Donors</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-amber-450 font-mono">{summary.fatigue_ceiling_count}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full border border-amber-500/20 font-mono">Ceiling Reached</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Active System Monitors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Sentinel Check-ins</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-slate-200 font-mono flex items-center gap-1.5">
                  <Activity className="w-6 h-6 text-amber-500 animate-pulse" />
                  {summary.active_sentinel_alerts}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 font-mono">ACTIVE ALARM</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Blood Weather Warnings</span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-rose-450 font-mono flex items-center gap-1.5">
                  <CloudLightning className="w-6 h-6 text-rose-500 animate-bounce" />
                  {summary.critical_weather_weeks}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/20 font-mono animate-pulse">CRITICAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
