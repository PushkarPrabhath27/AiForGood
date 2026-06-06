"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { Heart, ChevronLeft, Calendar, User, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface GriefGuardianLog {
  name: string;
  relation: string;
  channel: string;
  message_sent: boolean;
  message_date: string;
  transition_consent: "pending" | "consented" | "opted_out";
}

interface DeceasedPatientLog {
  patient_id: string;
  patient_name: string;
  deceased_at: string;
  guardians: GriefGuardianLog[];
}

export default function GriefProtocolLogPage() {
  const { data: log = [], isLoading, error } = useQuery<DeceasedPatientLog[]>({
    queryKey: ["grief-protocol-log"],
    queryFn: () => apiGet<DeceasedPatientLog[]>("/api/v1/admin/grief-protocol"),
    refetchInterval: 15000, // Refresh every 15s to catch status change actions immediately
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 w-64 bg-slate-900 rounded-xl mb-4" />
        <div className="h-40 bg-slate-900 rounded-2xl" />
        <div className="h-40 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-rose-400 mb-2">
          <Heart className="w-5 h-5 text-rose-500" />
          <h4 className="text-sm font-bold uppercase tracking-wider font-mono">
            Grief Log Offline
          </h4>
        </div>
        <p className="text-xs text-rose-350 font-medium">
          Failed to establish clinical grief ledger connection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* Back button & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-450 hover:text-slate-200 group transition-colors"
          aria-label="Back to Admin portal"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
          Back to Admin
        </Link>
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-slate-400" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
              Grief Protocol Audit Ledger
            </h1>
            <p className="text-sm text-slate-450 mt-1 font-medium">
              Operational registry for memorial broadcasts and network transition consent auditing
            </p>
          </div>
        </div>
      </div>

      {log.length === 0 ? (
        <div className="rounded-3xl border border-slate-850 bg-slate-900/10 p-10 text-center space-y-3">
          <Heart className="w-12 h-12 text-slate-700 mx-auto" />
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">
            No active protocols
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            All registered patients currently in active treatment. Grief protocol logs register automatically upon coordinator status commitment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {log.map((entry) => (
            <div
              key={entry.patient_id}
              className="rounded-3xl border border-slate-850 bg-slate-900/30 p-6 shadow-xl space-y-6"
            >
              {/* Demographics Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-850/50 rounded-xl flex items-center justify-center border border-slate-800">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-250 uppercase tracking-wide">
                      {entry.patient_name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Patient ID: PRY-{entry.patient_id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-950/40 border border-slate-850 px-3.5 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Deceased Date: {format(new Date(entry.deceased_at), "MMM dd, yyyy · hh:mm a")}
                </div>
              </div>

              {/* Guardians transition list */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-550 uppercase tracking-wider font-mono">
                  Memorial message & transition dispatch details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {entry.guardians.map((g, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-850/80 bg-slate-950/30 p-4 rounded-2xl flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-350">{g.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{g.relation}</p>
                        </div>
                        {g.message_sent ? (
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-mono whitespace-nowrap">
                            MEMORIAL DISPATCHED ({g.channel})
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 font-mono whitespace-nowrap">
                            DISPATCH ERROR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-850/40 pt-3">
                        <span className="text-[9px] text-slate-500 font-mono">
                          Sent: {format(new Date(g.message_date), "MMM d, h:mm a")}
                        </span>
                        
                        {/* Consent Status Badge */}
                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                          {g.transition_consent === "consented" && (
                            <span className="flex items-center gap-1 text-emerald-450 bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              TRANSITION CONSENTED
                            </span>
                          )}
                          {g.transition_consent === "pending" && (
                            <span className="flex items-center gap-1 text-amber-450 bg-amber-500/5 border border-amber-500/15 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              CONSENT PENDING
                            </span>
                          )}
                          {g.transition_consent === "opted_out" && (
                            <span className="flex items-center gap-1 text-slate-450 bg-slate-850/50 border border-slate-800 px-2.5 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-slate-500" />
                              OPTED OUT / ARCHIVED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
