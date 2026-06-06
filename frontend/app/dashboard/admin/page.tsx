"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Users,
  Activity,
  ShieldAlert,
  Map,
  Heart,
  AlertTriangle,
  CloudLightning,
  ChevronRight,
  TrendingUp,
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

export default function AdminOverviewPage() {
  const { data: summary, isLoading, error } = useQuery<AdminSummaryData>({
    queryKey: ["admin-summary"],
    queryFn: () => apiGet<AdminSummaryData>("/admin/summary"),
    refetchInterval: 30000, // 30s updates
  });

  const chartData = React.useMemo(() => {
    if (!summary?.city_health_score_history) return [];
    return summary.city_health_score_history.map((score, index) => ({
      day: `D-${30 - index}`,
      score,
    }));
  }, [summary]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 w-48 bg-slate-900 rounded-xl mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-slate-900 rounded-2xl" />
          <div className="h-28 bg-slate-900 rounded-2xl" />
          <div className="h-28 bg-slate-900 rounded-2xl" />
        </div>
        <div className="h-56 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-rose-400 mb-2">
          <ShieldAlert className="w-5 h-5" />
          <h4 className="text-sm font-bold uppercase tracking-wider font-mono">
            Admin Database Offline
          </h4>
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
            System Operations · Clinical KPIs & Resource Auditing
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

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patients Card */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-xl flex items-center gap-4 hover:border-slate-800 transition-all">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
            <Users className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Total Enrolled Patients
            </p>
            <h3 className="text-2xl font-black text-slate-200 mt-0.5 font-mono">
              {summary.total_patients}
            </h3>
          </div>
        </div>

        {/* Guardians Card */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-xl flex items-center gap-4 hover:border-slate-800 transition-all">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Secured Living Guardians
            </p>
            <h3 className="text-2xl font-black text-slate-200 mt-0.5 font-mono">
              {summary.total_guardians}
            </h3>
          </div>
        </div>

        {/* Blood Banks Card */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-xl flex items-center gap-4 hover:border-slate-800 transition-all">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
            <Map className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Connected Blood Banks
            </p>
            <h3 className="text-2xl font-black text-slate-200 mt-0.5 font-mono">
              {summary.total_blood_banks}
            </h3>
          </div>
        </div>
      </div>

      {/* Health score graph */}
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              City health score trend (30 Days)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Hyderabad Metro Area aggregate donor-to-patient alignment index
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
            <TrendingUp className="w-4 h-4" />
            Stable (CUSUM verified)
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-emerald)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--accent-emerald)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--accent-emerald)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Warnings & Risk Summaries Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Guardian Risk Stats */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Guardian Network Health
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Churn Risk */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Churn Risk Alerts
              </span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-rose-450 font-mono">
                  {summary.churn_risk_count}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/20 font-mono">
                  High CUSUM
                </span>
              </div>
            </div>

            {/* Fatigue Ceiling */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Fatigued Donors
              </span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-amber-450 font-mono">
                  {summary.fatigue_ceiling_count}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full border border-amber-500/20 font-mono">
                  Ceiling Reached
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Alert Monitors */}
        <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active System Monitors
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sentinel Alerts */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Sentinel Check-ins
              </span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-slate-200 font-mono flex items-center gap-1.5">
                  <Activity className="w-6 h-6 text-amber-500 animate-pulse" />
                  {summary.active_sentinel_alerts}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 font-mono">
                  ACTIVE ALARM
                </span>
              </div>
            </div>

            {/* Blood Weather Alert */}
            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-28">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Blood Weather Warnings
              </span>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-black text-rose-450 font-mono flex items-center gap-1.5">
                  <CloudLightning className="w-6 h-6 text-rose-500 animate-bounce" />
                  {summary.critical_weather_weeks}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/20 font-mono animate-pulse">
                  CRITICAL WEEK 3
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
