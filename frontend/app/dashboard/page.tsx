"use client";

import * as React from "react";
import { usePatients } from "@/lib/hooks/usePatients";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatDate } from "@/lib/utils/dates";
import { formatHb } from "@/lib/utils/format";
import { Users, Calendar, ArrowRight, ShieldAlert, Heart, Search, Cpu } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Patient } from "@/../shared/contracts/api.types";

export default function DashboardOverviewPage() {
  const { data: response, isLoading, error } = usePatients();
  const [showBanner, setShowBanner] = React.useState(true);
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") || "";

  // Dynamic matched text highlight helper using aether styling
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="bg-pulse-cyan/25 text-pulse-cyan px-1 py-0.5 rounded font-extrabold font-mono">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-aether-slate rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (error || !response?.success || !response.data) {
    const errMsg = (error as any)?.message || "Failed to establish database synchronization.";
    return <AlertBanner variant="error" title="Clinical Sync Failed" message={errMsg} />;
  }

  const patients = response.data.patients;

  // Filter patient cards list in real-time
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const bloodTypeStr = `${patient.blood_type}${patient.rh_factor}`.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.id.toLowerCase().includes(query) ||
      bloodTypeStr.includes(query)
    );
  });

  return (
    <div className="space-y-8 relative">
      {/* Drifting neural mesh background overlay */}
      <div className="absolute inset-0 neural-mesh opacity-[0.01] pointer-events-none" />

      {/* Demo Sandbox Alert Banner redesigned as aether glass */}
      {showBanner && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg aether-glass border border-pulse-cyan/20 text-slate-300 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">💡</span>
            <div className="text-xs">
              <h4 className="font-extrabold text-white font-space uppercase tracking-wider">Active Clinical Sandbox Demo</h4>
              <p className="text-slate-400 font-medium mt-0.5 font-mono text-[10px]">
                VIEWING MOCK CLINICAL COORDINATES MAPPED TO HYDERABAD DIRECTORY · PRIYA SHARMA & VIKRAM REDDY
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-pulse-cyan px-2.5 py-1 transition-all font-mono"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Overview Header in Space Grotesk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2 font-space uppercase">
            <Users className="w-8 h-8 text-pulse-cyan" />
            Active Patients
          </h1>
          <p className="text-[10px] text-pulse-cyan mt-1 font-bold font-mono tracking-widest uppercase">
            2 MONITORED • HYDERABAD CLUSTER • NILOUFER CHILDREN'S HOSPITAL
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] aether-glass border border-pulse-cyan/15 px-3.5 py-1.5 rounded-md text-pulse-emerald font-semibold shadow-lg font-mono uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-pulse-emerald animate-pulse" />
          Clinical database synced
        </div>
      </div>

      {/* Real-time search query display status */}
      {searchQuery && (
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
          Showing results for query: <span className="font-mono text-pulse-cyan bg-aether-slate border border-pulse-cyan/10 px-2 py-0.5 rounded">"{searchQuery}"</span>
        </div>
      )}

      {/* Patient Grid / Empty State fallback */}
      {filteredPatients.length === 0 ? (
        <Card className="aether-glass border border-pulse-cyan/15 rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed relative overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-aether-void flex items-center justify-center text-slate-500 border border-aether-ink">
            <Search className="w-5 h-5 text-pulse-cyan animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-bold font-space uppercase text-sm">No Patients Found</h3>
            <p className="text-slate-400 text-xs font-mono max-w-[280px] leading-relaxed uppercase text-[9px] tracking-wider">
              No matching records discovered in local clinical directory for search criteria.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {filteredPatients.map((patient) => {
            const bloodGroupStr = `${patient.blood_type}${patient.rh_factor}`;
            const isPriya = patient.name.includes("Priya");
            const daysLeft = isPriya ? 14 : 18; // relative to Oct 20 today
            
            // Dynamic color/status resolver based on Hb value
            const hb = patient.hb_current ?? 0;
            let statusLabel = "STABLE";
            let statusBadgeClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
            let hbColorClass = "text-emerald-450";
            let leftBorderClass = "border-l-4 border-l-status-green";

            if (hb < 7.0) {
              statusLabel = "CRITICAL";
              statusBadgeClass = "bg-rose-500/20 text-rose-450 border-rose-500/30";
              hbColorClass = "text-rose-450";
              leftBorderClass = "border-l-4 border-l-status-red";
            } else if (hb < 8.0) {
              statusLabel = "WARNING";
              statusBadgeClass = "bg-amber-500/20 text-amber-450 border-amber-500/30";
              hbColorClass = "text-amber-400";
              leftBorderClass = "border-l-4 border-l-status-amber";
            }

            return (
              <Card
                key={patient.id}
                className={cn(
                  "bg-gradient-to-b from-bg-secondary to-bg-tertiary aether-glass rounded-xl overflow-hidden shadow-2xl flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.15)] hover:border-accent-blue/30 border border-bg-hover",
                  leftBorderClass
                )}
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      {/* Name in Space Grotesk and life-rose */}
                      <h2 className="text-xl font-bold text-accent-pink tracking-tight font-space leading-snug">
                        {highlightText(patient.name, searchQuery)}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                        Age: {patient.age} yrs · ID: <span className="font-mono text-slate-500">{highlightText(patient.id.slice(0, 8), searchQuery)}</span>
                      </p>
                    </div>
                    {/* Hollow Blood group badge */}
                    <Badge className="bg-bg-primary/80 border border-accent-cyan/35 text-accent-cyan font-bold font-mono px-2.5 py-0.5 rounded text-[10px] tracking-widest shadow-[0_0_8px_rgba(6,182,212,0.1)]">
                      {bloodGroupStr}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-0 flex-1 space-y-5">
                  {/* Stats Ledger Row */}
                  <div className="grid grid-cols-2 gap-4 bg-bg-primary/60 p-4 rounded-md border border-bg-hover">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase text-slate-500 block mb-1 font-mono tracking-wider">
                        Hemoglobin (Current)
                      </span>
                      <span className={cn("text-4xl font-bold font-mono tabular-nums leading-none", hbColorClass)}>
                        {formatHb(hb)} <span className="text-[9px] text-slate-500 font-normal lowercase tracking-normal">g/dL</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold uppercase text-slate-500 block mb-1 font-mono tracking-wider">
                        Biometric Prediction
                      </span>
                      <span className="text-sm font-bold text-white flex items-center gap-1.5 font-mono leading-none pt-2.5">
                        <Calendar className="w-3.5 h-3.5 text-accent-cyan" />
                        {patient.next_transfusion_predicted
                          ? formatDate(patient.next_transfusion_predicted, "MMM dd").toUpperCase()
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Alarm diagnostics / alert tags (Hollowed-out, thin borders) */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Dynamic Status Badge Pill */}
                    <Badge className={cn("font-bold font-mono text-[9px] uppercase tracking-wider rounded py-0.5 px-2 border", statusBadgeClass)}>
                      STATUS: {statusLabel}
                    </Badge>

                    {patient.alloimmunization_flag ? (
                      <Badge className="bg-bg-primary/60 text-accent-amber border border-accent-amber/35 font-bold font-mono text-[9px] uppercase tracking-wider rounded py-0.5 px-2 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-accent-amber animate-pulse" />
                        SEQUENTIAL CUSUM: WARNING
                      </Badge>
                    ) : (
                      <Badge className="bg-bg-primary/60 text-accent-cyan border border-accent-cyan/35 font-bold font-mono text-[9px] uppercase tracking-wider rounded py-0.5 px-2 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-accent-cyan fill-accent-cyan/10" />
                        DECAY TRAJECTORY: STABLE
                      </Badge>
                    )}
                    <Badge className="bg-bg-primary/60 text-accent-rose border border-accent-rose/35 font-bold font-mono text-[9px] uppercase tracking-wider rounded py-0.5 px-2">
                      T-{daysLeft} DAYS TARGET
                    </Badge>
                  </div>
                </CardContent>

                {/* Rethemed "ACCESS NEURAL PROFILE" trigger with gradient border and hover background */}
                <CardFooter className="p-6 pt-0 border-t border-bg-hover flex justify-end h-14 bg-bg-primary/20">
                  <Link
                    href={`/dashboard/patient/${patient.id}`}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-accent-cyan hover:text-white px-3 py-1 bg-accent-cyan/5 hover:bg-gradient-to-r hover:from-accent-blue hover:to-accent-cyan rounded-md border border-accent-cyan/20 hover:border-transparent transition-all uppercase tracking-widest font-mono group"
                    aria-label={`View clinical details for ${patient.name}`}
                  >
                    ACCESS NEURAL PROFILE
                    <ArrowRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-1 group-hover:text-white transition-all filter drop-shadow-[0_0_2px_rgba(6,182,212,0.6)]" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
