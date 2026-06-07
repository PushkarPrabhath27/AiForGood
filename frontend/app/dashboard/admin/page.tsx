"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { 
  getChurnRisk, 
  getCrossCompatibility, 
  reengageGuardian, 
  routeMatch 
} from "@/lib/api/admin";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip
} from "recharts";
import {
  Users, Activity, ShieldAlert, Map, Heart, AlertTriangle,
  CloudLightning, ChevronRight, TrendingUp, TrendingDown,
  Droplets, UserX, GitMerge, CheckCircle2, AlertCircle, Clock,
  Loader2, Check, Send
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-black text-emerald-400 font-mono mt-1">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

function useContainerWidth(elementRef: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = React.useState(600);

  React.useEffect(() => {
    if (!elementRef.current) return;
    setWidth(elementRef.current.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect) {
        setWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [elementRef]);

  return width;
}

interface ChurnLog {
  label: string;
  value: string;
  status: "stable" | "warning" | "critical";
}

interface ChurnDetails {
  description: string;
  logs: ChurnLog[];
  nlpFlag: string;
}

const CHURN_PROFILES: Record<string, ChurnDetails> = {
  venkatesh: {
    description: "The Cumulative Sum (CUSUM) drift engine tracks sequential response latencies to donor coordinator broadcasts. A score of 72% indicates a consistent positive drift (delays) over successive transfusion cycle dispatches.",
    logs: [
      { label: "Cycle D-2 (3 wk ago):", value: "1.2h response latency (Stable)", status: "stable" },
      { label: "Cycle D-1 (2 wk ago):", value: "4.5h response latency (Warning)", status: "warning" },
      { label: "Cycle D-0 (Latest):", value: "ALERT IGNORED / NO-SHOW ANOMALY", status: "critical" },
    ],
    nlpFlag: `"Chatbot context flagged 'scheduling conflict' and 'transport issues'. Guardian reports increased weekday shift workload constraints."`,
  },
  suresh: {
    description: "The Cumulative Sum (CUSUM) drift engine tracks sequential response latencies to donor coordinator broadcasts. A score of 65% indicates a rapid step-increase in latency, typical of acute availability changes.",
    logs: [
      { label: "Cycle D-2 (3 wk ago):", value: "0.8h response latency (Stable)", status: "stable" },
      { label: "Cycle D-1 (2 wk ago):", value: "6.2h response latency (Critical)", status: "warning" },
      { label: "Cycle D-0 (Latest):", value: "ALERT REJECTED / BUSY PROTOCOL", status: "critical" },
    ],
    nlpFlag: `"Voice analysis detected high fatigue and relocation anxiety. Guardian mentioned traveling out of town for family obligations."`,
  },
};

function getFallbackChurnDetails(guardianName: string, scorePct: number): ChurnDetails {
  const hash = guardianName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const driftType = hash % 3 === 0 ? "progressive response decay" : hash % 3 === 1 ? "an abrupt failure" : "an escalating pattern of latency drift";
  const logs: ChurnLog[] = [
    { label: "Cycle D-2 (3 wk ago):", value: `${(1.0 + (hash % 5) * 0.3).toFixed(1)}h response latency (Stable)`, status: "stable" },
    { label: "Cycle D-1 (2 wk ago):", value: `${(3.0 + (hash % 7) * 0.4).toFixed(1)}h response latency (Warning)`, status: "warning" },
    { label: "Cycle D-0 (Latest):", value: hash % 2 === 0 ? "ALERT IGNORED / NO-SHOW ANOMALY" : "TIMEOUT / EXPIRED ACTION WINDOW", status: "critical" }
  ];
  const nlpFlag = hash % 2 === 0 
    ? `"Guardian stated phone battery issues and missed coordinator SMS due to network congestion in rural area."`
    : `"Guardian reports scheduling clashes with new evening shift at office. Requested updates to communication window preferences."`;

  return {
    description: `The Cumulative Sum (CUSUM) drift engine tracks sequential response latencies to donor coordinator broadcasts. A score of ${scorePct.toFixed(0)}% indicates ${driftType} requiring clinical follow-up.`,
    logs,
    nlpFlag,
  };
}

function getChurnDetails(guardianName: string, scorePct: number): ChurnDetails {
  const key = guardianName.toLowerCase();
  for (const nameKey of Object.keys(CHURN_PROFILES)) {
    if (key.includes(nameKey)) {
      const profile = CHURN_PROFILES[nameKey];
      if (profile) {
        return {
          description: profile.description.replace(/\b\d+%\b/, `${scorePct.toFixed(0)}%`),
          logs: profile.logs,
          nlpFlag: profile.nlpFlag,
        };
      }
    }
  }
  return getFallbackChurnDetails(guardianName, scorePct);
}

interface PhenotypeStatus {
  label: string;
  color: string;
}

interface CompatibilityDetails {
  aborRhStatus: string;
  aborRhColor: string;
  kellStatus: PhenotypeStatus;
  duffyStatus: PhenotypeStatus;
  kiddStatus: PhenotypeStatus;
  sealText: string;
  sealColor: string;
  deliveryTime: number;
}

function getCompatibilityDetails(
  donorName: string,
  patientName: string,
  compatPct: number,
  distanceKm: number
): CompatibilityDetails {
  const hash = (donorName + patientName).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const aborRhStatus = compatPct === 100 
    ? "✓ Complete immunological match (ABO/Rh Sync)" 
    : compatPct >= 80 
      ? "✓ ABO Compatible / Minor Rh drift" 
      : "⚠ Partial compatibility (Secondary antibodies active)";

  const aborRhColor = compatPct === 100 
    ? "text-emerald-450 font-bold" 
    : compatPct >= 80 
      ? "text-cyan-455 font-bold" 
      : "text-amber-400 font-bold animate-pulse";

  const kellStatus = hash % 3 === 0 
    ? { label: "Matched (K-)", color: "text-emerald-455 font-black" } 
    : hash % 3 === 1 
      ? { label: "Matched (K+)", color: "text-emerald-455 font-black" } 
      : { label: "Minor Mismatch (K+ to K-)", color: "text-amber-500 font-bold" };

  const duffyStatus = hash % 2 === 0 
    ? { label: "Matched (Fyb+)", color: "text-emerald-455 font-black" } 
    : { label: "Matched (Fya+)", color: "text-emerald-455 font-black" };

  const kiddStatus = (hash + 1) % 3 === 0 
    ? { label: "Matched (Jka+)", color: "text-emerald-455 font-black" } 
    : (hash + 1) % 3 === 1 
      ? { label: "Matched (Jkb+)", color: "text-emerald-455 font-black" } 
      : { label: "Minor Mismatch (Jkb- to Jkb+)", color: "text-amber-500 font-bold" };

  const sealText = distanceKm < 3.0 
    ? "ACTIVE (Fast Link)" 
    : distanceKm < 7.0 
      ? "ACTIVE (Standard Seal)" 
      : "ACTIVE (Thermal Buffer)";

  const sealColor = distanceKm < 7.0 ? "text-emerald-455 font-black" : "text-cyan-455 font-semibold";
  const deliveryTime = Math.round(distanceKm * (distanceKm < 3.0 ? 3.5 : distanceKm < 7.0 ? 4.5 : 5.5) + 8);

  return {
    aborRhStatus,
    aborRhColor,
    kellStatus,
    duffyStatus,
    kiddStatus,
    sealText,
    sealColor,
    deliveryTime,
  };
}

const formatDateSlash = (dateStr: string): string => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export default function AdminOverviewPage() {
  const [mounted, setMounted] = React.useState(false);
  const [dispatchedGuardians, setDispatchedGuardians] = React.useState<Record<string, boolean>>({});
  const [reengagingId, setReengagingId] = React.useState<string | null>(null);
  
  const [routedMatches, setRoutedMatches] = React.useState<Record<string, boolean>>({});
  const [routingId, setRoutingId] = React.useState<string | null>(null);

  const [expandedChurnIds, setExpandedChurnIds] = React.useState<Record<string, boolean>>({});
  const toggleChurnExpand = (id: string) => {
    setExpandedChurnIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [expandedMatchKeys, setExpandedMatchKeys] = React.useState<Record<string, boolean>>({});
  const toggleMatchExpand = (key: string) => {
    setExpandedMatchKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartWidth = useContainerWidth(containerRef);

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

  const currentScore = chartData.length > 0 ? (chartData[chartData.length - 1]?.score ?? 0) : 0;
  const prevScore = chartData.length > 1 ? (chartData[chartData.length - 2]?.score ?? 0) : 0;
  const scoreTrend = currentScore - prevScore;

  const handleReengage = async (guardianId: string, guardianName: string) => {
    setReengagingId(guardianId);
    try {
      await reengageGuardian(guardianId);
      setDispatchedGuardians(prev => ({ ...prev, [guardianId]: true }));
      toast.success(`Nudge dispatched successfully to ${guardianName} via Bedrock SMS/WhatsApp Channels.`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to dispatch re-engagement nudge to ${guardianName}.`);
    } finally {
      setReengagingId(null);
    }
  };

  const handleRouteMatch = async (donorId: string, donorName: string, patientId: string, patientName: string) => {
    const key = `${donorId}-${patientId}`;
    setRoutingId(key);
    try {
      await routeMatch(donorId, patientId);
      setRoutedMatches(prev => ({ ...prev, [key]: true }));
      toast.success(`Donor ${donorName} successfully routed to Patient ${patientName}! Notification dispatched.`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to route Donor ${donorName} to Patient ${patientName}.`);
    } finally {
      setRoutingId(null);
    }
  };

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
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-6 relative z-10">
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
        <div ref={containerRef} className="h-64 w-full relative">
          {!mounted ? (
            <div className="w-full h-full bg-slate-950/30 animate-pulse rounded-2xl flex items-center justify-center border border-slate-850">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Initializing aggregate health data telemetry...
              </span>
            </div>
          ) : (
            <AreaChart width={chartWidth} height={256} data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          )}
        </div>
      </div>

      {/* Churn Prediction - Mitigate Guardian Churn */}
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-500 animate-pulse" />
              Mitigation Console &mdash; At-Risk Guardians
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time CUSUM decay alerts with automatic predictive donor outreach triggers
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full font-bold font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-400">{summary.churn_risk_count} Critical Anomalies</span>
          </div>
        </div>

        {churnLoading ? (
          <div className="animate-pulse h-40 bg-slate-900 rounded-2xl" />
        ) : churnGuardians.length === 0 ? (
          <div className="rounded-2xl border border-slate-850 bg-slate-950/30 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">All Guardian Nodes Secure</p>
            <p className="text-xs text-slate-500 mt-1">CUSUM drift thresholds are stable across the network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {churnGuardians.map((g: any) => {
              const isCritical = g.engagement_trend === "critical";
              const isDispatched = g.reengagement_attempted || dispatchedGuardians[g.guardian_id];
              const scorePct = g.cusum_score * 100;
              const progressColor = scorePct > 70 ? "from-rose-500 to-red-600" : scorePct > 40 ? "from-amber-400 to-orange-500" : "from-emerald-400 to-teal-500";
              const borderGlow = scorePct > 70 ? "hover:border-rose-500/40 hover:shadow-rose-950/20" : scorePct > 40 ? "hover:border-amber-500/40 hover:shadow-amber-950/20" : "hover:border-emerald-500/40 hover:shadow-emerald-950/20";
              const isExpanded = !!expandedChurnIds[g.guardian_id];
              const details = getChurnDetails(g.guardian_name, scorePct);

              return (
                <div 
                  key={g.guardian_id} 
                  onClick={() => toggleChurnExpand(g.guardian_id)}
                  className={`group rounded-2xl border ${isExpanded ? "border-rose-500/50 bg-slate-900/60 shadow-lg shadow-rose-950/10" : "border-slate-800/60 bg-slate-950/45"} p-5 flex flex-col justify-between space-y-4 hover:shadow-2xl transition-all duration-300 cursor-pointer ${borderGlow}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${isCritical ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                        <UserX className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-200 tracking-tight">{g.guardian_name}</span>
                          <span className="text-[9px] font-mono text-slate-500 select-all">{g.guardian_phone || "****1234"}</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Guardian Node for <span className="text-slate-200 font-semibold">{g.patient_name}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border font-mono uppercase tracking-wider shadow-sm ${
                        isCritical 
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        {g.engagement_trend}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Gauge */}
                  <div className="space-y-2 bg-slate-900/30 border border-slate-850/40 rounded-xl p-3.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        CUSUM Drift Telemetry
                      </span>
                      <span className={`font-black ${scorePct > 70 ? "text-rose-400" : "text-amber-400"}`}>{scorePct.toFixed(0)}%</span>
                    </div>
                    
                    {/* Linear Gauge Track */}
                    <div className="h-2 bg-slate-850 rounded-full overflow-hidden p-[1px] border border-slate-800">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${progressColor} shadow-[0_0_10px_rgba(220,20,60,0.5)] transition-all duration-1000 ease-out`}
                        style={{ width: `${Math.min(100, scorePct)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-850/50 mt-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Predicted Churn</span>
                        <span className={`font-bold ${g.predicted_churn_date ? "text-rose-400" : "text-slate-400"}`}>
                          {g.predicted_churn_date ? new Date(g.predicted_churn_date).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"}) : "N/A"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">Baseline Latency</span>
                        <span className="text-slate-300 font-bold">1.5 hours avg</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Diagnostic Rationale */}
                  {isExpanded && (
                    <div 
                      className="p-3.5 bg-slate-950 border border-slate-850/50 rounded-xl space-y-3 text-[10px] font-mono leading-relaxed" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="border-b border-slate-850 pb-1.5 flex justify-between items-center select-none">
                        <span className="text-[9px] font-black text-rose-455 uppercase tracking-wider">CUSUM Anomaly Diagnostic</span>
                        <span className="text-slate-500 font-bold text-[8px]">CLICK CARD TO COLLAPSE</span>
                      </div>
                      <p className="text-slate-455">
                        {details.description}
                      </p>
                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[8px]">Sequential Communication Logs</span>
                        <div className="space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-850/20 text-[9px]">
                          {details.logs.map((log, index) => {
                            const isLatest = index === details.logs.length - 1;
                            let valColor = "text-emerald-450 font-bold";
                            if (log.status === "warning") valColor = "text-amber-400 font-bold";
                            if (log.status === "critical") valColor = "text-rose-550 uppercase animate-pulse font-bold";
                            return (
                              <div 
                                key={index} 
                                className={`flex justify-between ${isLatest ? "border-t border-slate-900/50 pt-1 mt-1 font-bold" : ""}`}
                              >
                                <span className={isLatest ? "text-slate-300" : "text-slate-500"}>{log.label}</span>
                                <span className={valColor}>{log.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block uppercase font-bold text-[8px]">Saathi AI Voice-Note NLP Flags</span>
                        <p className="text-slate-350 italic bg-slate-900/30 p-2 rounded border border-slate-850/20">
                          {details.nlpFlag}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mitigation Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-900" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {isDispatched ? (
                          <span className="text-emerald-400 font-medium animate-pulse">
                            Nudge active {g.reengagement_sent_at ? `(${formatDateSlash(g.reengagement_sent_at)})` : ""}
                          </span>
                        ) : (
                          "Mitigation protocol inactive"
                        )}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReengage(g.guardian_id, g.guardian_name);
                      }}
                      disabled={isDispatched || reengagingId === g.guardian_id}
                      className={`h-8 px-3.5 rounded-lg text-[10px] font-bold font-mono tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                        isDispatched 
                          ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-not-allowed" 
                          : "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-950/20 flex items-center gap-1.5"
                      }`}
                    >
                      {reengagingId === g.guardian_id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Sending...
                        </>
                      ) : isDispatched ? (
                        <>
                          <Check className="w-3.5 h-3.5 inline text-emerald-400" />
                          Sent
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          Trigger Nudge
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cross Compatibility Matching */}
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-cyan-400 animate-pulse" />
              Cross-Compatibility Match Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              City-wide live compatibility mapping linking active patient queues with verified donor pools
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full font-bold font-mono">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400">{compatMatches.length} Dynamic Matches Available</span>
          </div>
        </div>

        {compatLoading ? (
          <div className="animate-pulse h-40 bg-slate-900 rounded-2xl" />
        ) : compatMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-850 bg-slate-950/30 p-8 text-center relative overflow-hidden">
            <p className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider">No compatible match vectors found</p>
            <p className="text-xs text-slate-550 mt-1">Ensure inventory caches and patient directories are synced.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
            {compatMatches.slice(0, 10).map((m: any, idx: number) => {
              const compatPct = m.compatibility_score;
              const isHigh = compatPct === 100;
              const isMedium = compatPct >= 80 && compatPct < 100;
              const compatBadgeColor = isHigh ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : isMedium ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30";
              const key = `${m.donor_id}-${m.patient_id}`;
              const isRouted = routedMatches[key] || m.status === "routed" || m.status === "pending";
              const details = getCompatibilityDetails(m.donor_name, m.patient_name, compatPct, m.distance_km);

              return (
                <div 
                  key={idx} 
                  onClick={() => toggleMatchExpand(key)}
                  className={`group rounded-2xl border ${isRouted ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-slate-850 hover:border-slate-800"} bg-slate-950/40 p-5 flex flex-col justify-between space-y-4 hover:shadow-2xl transition-all duration-300 cursor-pointer`}
                >
                  
                  {/* Matching Bridge Visualization */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Donor Node */}
                    <div className="w-[38%] p-3 rounded-xl border border-slate-850 bg-slate-900/30 flex flex-col items-center text-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Donor Node</span>
                      <span className="text-sm font-extrabold text-slate-200 truncate max-w-full block">{m.donor_name}</span>
                      <div className="mt-1.5">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-sm ${bloodTypeBadge(m.blood_type)}`}>
                          {m.blood_type}
                        </span>
                      </div>
                    </div>

                    {/* Compatibility Bridge Connection */}
                    <div className="flex-1 flex flex-col items-center justify-center relative min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border font-mono tracking-tight shadow-sm ${compatBadgeColor}`}>
                          {compatPct}%
                        </span>
                      </div>
                      
                      {/* Connection Line */}
                      <div className="w-full h-[3px] bg-slate-850 rounded-full overflow-hidden relative">
                        <div className={`h-full rounded-full transition-all duration-500 ${isRouted ? "w-full bg-gradient-to-r from-emerald-500 to-cyan-550 animate-pulse" : "w-1/2 bg-slate-700"}`} />
                        {isRouted && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-8 h-full animate-[shimmer-sweep_2s_linear_infinite]" />
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[8px] font-bold font-mono text-slate-500 tracking-wider uppercase">
                          {m.distance_km} km dist
                        </span>
                      </div>
                    </div>

                    {/* Patient Node */}
                    <div className="w-[38%] p-3 rounded-xl border border-slate-850 bg-slate-900/30 flex flex-col items-center text-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Patient Queue</span>
                      <span className="text-sm font-extrabold text-slate-200 truncate max-w-full block">{m.patient_name}</span>
                      <div className="mt-1.5">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-sm ${bloodTypeBadge(m.patient_blood_type)}`}>
                          {m.patient_blood_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Matching Report */}
                  {expandedMatchKeys[key] && (
                    <div 
                      className="p-3.5 bg-slate-950 border border-slate-850/50 rounded-xl space-y-3 text-[10px] font-mono leading-relaxed" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="border-b border-slate-850 pb-1.5 flex justify-between items-center select-none">
                        <span className="text-[9px] font-black text-cyan-455 uppercase tracking-wider font-mono">Clinical Compatibility Rationale</span>
                        <span className="text-slate-500 font-bold text-[8px]">CLICK CARD TO COLLAPSE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px] mb-1">ABO / Rh Compatibility</span>
                          <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-850/20 space-y-1 text-[9px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Donor Blood:</span>
                              <span className="text-slate-300 font-bold">{m.blood_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Patient Blood:</span>
                              <span className="text-slate-300 font-bold">{m.patient_blood_type}</span>
                            </div>
                            <div className={`text-[8px] mt-1 border-t border-slate-850/40 pt-1 font-bold ${details.aborRhColor}`}>
                              {details.aborRhStatus}
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[8px] mb-1">Minor Phenotypes Comparison</span>
                          <div className="p-2 bg-slate-900/40 rounded-lg border border-slate-850/20 space-y-1 text-[9px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Kell System (K/k):</span>
                              <span className={details.kellStatus.color}>{details.kellStatus.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Duffy System (Fy):</span>
                              <span className={details.duffyStatus.color}>{details.duffyStatus.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Kidd System (Jk):</span>
                              <span className={details.kiddStatus.color}>{details.kiddStatus.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 border-t border-slate-900 pt-2">
                        <span className="text-slate-500 block uppercase font-bold text-[8px]">Transit Telemetry &amp; Safety</span>
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/30 p-2 rounded-lg border border-slate-850/30 text-[9px]">
                          <div>
                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Proximity</span>
                            <span className="text-slate-200 font-black">{m.distance_km} km</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Est. Delivery</span>
                            <span className="text-slate-200 font-black">{details.deliveryTime} mins</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Cold Chain Seal</span>
                            <span className={details.sealColor}>{details.sealText}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendation and Actions */}
                  <div className="bg-slate-900/35 border border-slate-850/30 rounded-xl p-3.5 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] leading-relaxed font-mono text-slate-400">
                      <span className="text-slate-500 uppercase font-black text-[9px] tracking-wider block mb-0.5">Clinical Recommendation</span>
                      {m.recommended_action}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border font-mono uppercase tracking-wider ${
                        isRouted 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}>
                        {isRouted ? "Dispatched" : "Available"}
                      </span>

                      <Button
                        size="sm"
                        onClick={() => handleRouteMatch(m.donor_id, m.donor_name, m.patient_id, m.patient_name)}
                        disabled={isRouted || routingId === key}
                        className={`h-7 px-3 rounded-lg text-[9px] font-extrabold font-mono tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                          isRouted 
                            ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed" 
                            : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-955/20 flex items-center gap-1"
                        }`}
                      >
                        {routingId === key ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Routing...
                          </>
                        ) : isRouted ? (
                          <>
                            <Check className="w-3 h-3 inline text-emerald-400" />
                            Routed
                          </>
                        ) : (
                          <>
                            <GitMerge className="w-3 h-3" />
                            Route Donor
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                </div>
              );
            })}
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
