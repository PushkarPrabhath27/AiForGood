"use client";

import * as React from "react";
import { usePatients } from "@/lib/hooks/usePatients";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { formatDate } from "@/lib/utils/dates";
import { formatHb } from "@/lib/utils/format";
import {
  Users, Calendar, ArrowRight, ShieldAlert, Heart,
  Activity, AlertTriangle, CheckCircle, Network
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Patient } from "@/../shared/contracts/api.types";

export default function DashboardOverviewPage() {
  const { data: response, isLoading, error } = usePatients();
  const [showBanner, setShowBanner] = React.useState(true);
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") || "";

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span
              key={i}
              style={{
                background: "rgba(0, 180, 216, 0.2)",
                color: "var(--accent-cyan)",
                padding: "0 2px",
                borderRadius: 3,
                fontFamily: "var(--font-jetbrains-mono)",
                fontWeight: 800,
              }}
            >
              {part}
            </span>
          ) : part
        )}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--bg-surface)" }} />
          ))}
        </div>
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

  const statBar = [
    { label: "PATIENTS MONITORED", value: patients.length, icon: <Users className="w-5 h-5" />, color: "var(--accent-cyan)" },
    { label: "TRANSFUSIONS THIS MONTH", value: "4", icon: <Activity className="w-5 h-5" />, color: "var(--accent-emerald)" },
    { label: "ACTIVE ALERTS", value: patients.filter((p) => p.alloimmunization_flag).length, icon: <AlertTriangle className="w-5 h-5" />, color: "var(--accent-crimson)" },
    { label: "GUARDIANS CONFIRMED", value: "7/8", icon: <CheckCircle className="w-5 h-5" />, color: "var(--accent-amber)" },
  ];

  return (
    <div className="space-y-8 relative">
      {/* Demo Sandbox Alert */}
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl flex items-center justify-between gap-4"
          style={{
            background: "rgba(0, 180, 216, 0.04)",
            border: "1px solid rgba(0, 180, 216, 0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--accent-cyan)" }} />
            <div>
              <h4
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-primary)" }}
              >
                Active Clinical Sandbox — HYD Cluster
              </h4>
              <p
                className="text-[9px] mt-0.5"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
              >
                PRIYA SHARMA · VIKRAM REDDY · NILOUFER CHILDREN'S HOSPITAL
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-[9px] font-bold uppercase tracking-widest transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-cyan)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; }}
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Stat Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statBar.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="p-4 rounded-xl relative overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: s.color, opacity: 0.8 }}>{s.icon}</span>
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: s.color }}
              >
                {s.value}
              </span>
            </div>
            <span
              className="text-[8px] font-bold uppercase tracking-widest"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
            >
              {s.label}
            </span>
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: s.color, opacity: 0.5 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2"
            style={{ fontFamily: "var(--font-space-grotesk)", color: "var(--text-primary)" }}
          >
            <Users className="w-6 h-6" style={{ color: "var(--accent-cyan)" }} />
            Patient Registry
          </h1>
          <p
            className="text-[9px] mt-1 font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
          >
            2 MONITORED · HYDERABAD CLUSTER · NILOUFER CHILDREN'S HOSPITAL
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-[9px] font-bold px-3 py-1.5 rounded-md"
          style={{
            background: "rgba(82, 183, 136, 0.06)",
            border: "1px solid rgba(82, 183, 136, 0.2)",
            color: "var(--accent-emerald)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-emerald)" }} />
          LIVE DATABASE SYNC
        </div>
      </div>

      {searchQuery && (
        <div
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
        >
          Results for:{" "}
          <span
            className="px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0, 180, 216, 0.1)", color: "var(--accent-cyan)", border: "1px solid rgba(0,180,216,0.2)" }}
          >
            "{searchQuery}"
          </span>
        </div>
      )}

      {/* Patient Grid */}
      {filteredPatients.length === 0 ? (
        <div
          className="p-12 rounded-xl flex flex-col items-center justify-center text-center gap-4"
          style={{ border: "1px dashed var(--bg-border)", background: "var(--bg-surface)" }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
          >
            <Network className="w-5 h-5" style={{ color: "var(--accent-cyan)" }} />
          </div>
          <div>
            <h3
              className="font-bold text-sm uppercase"
              style={{ fontFamily: "var(--font-space-grotesk)", color: "var(--text-primary)" }}
            >
              No Patients Found
            </h3>
            <p
              className="text-[9px] mt-1 max-w-[280px] leading-relaxed"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
            >
              No matching clinical records for the current search criteria.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPatients.map((patient, index) => {
            const bloodGroupStr = `${patient.blood_type}${patient.rh_factor}`;
            const isPriya = patient.name.includes("Priya");
            const daysLeft = isPriya ? 14 : 18;
            const hb = patient.hb_current ?? 0;

            const isCritical = hb < 7.0;
            const isWarning = hb < 8.0 && hb >= 7.0;
            const statusColor = isCritical ? "var(--accent-crimson)" : isWarning ? "var(--accent-amber)" : "var(--accent-emerald)";
            const statusLabel = isCritical ? "CRITICAL" : isWarning ? "WARNING" : "STABLE";
            const daysColor = daysLeft <= 7 ? "var(--accent-crimson)" : daysLeft <= 14 ? "var(--accent-amber)" : "var(--accent-emerald)";

            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.35, ease: "easeOut" }}
                className="group relative rounded-xl overflow-hidden flex flex-col transition-all duration-300"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderLeft: `4px solid ${statusColor}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px rgba(230, 57, 70, 0.08)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${statusColor}60`;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--bg-border)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div className="p-6 flex-1">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="space-y-1">
                      <h2
                        className="text-xl font-bold tracking-tight uppercase leading-snug"
                        style={{ fontFamily: "var(--font-space-grotesk)", color: "var(--accent-crimson)" }}
                      >
                        {highlightText(patient.name, searchQuery)}
                      </h2>
                      <p
                        className="text-[9px] font-bold uppercase tracking-wider"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
                      >
                        Age: {patient.age} yrs · ID:{" "}
                        <span style={{ color: "var(--text-dim)" }}>
                          {highlightText(patient.id.slice(0, 8), searchQuery)}
                        </span>
                      </p>
                    </div>

                    {/* Blood type badge */}
                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold flex-shrink-0"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        background: "rgba(0, 180, 216, 0.08)",
                        border: "1px solid rgba(0, 180, 216, 0.3)",
                        color: "var(--accent-cyan)",
                      }}
                    >
                      {bloodGroupStr}
                    </span>
                  </div>

                  {/* Stats block */}
                  <div
                    className="grid grid-cols-2 gap-4 p-4 rounded-lg mb-4"
                    style={{ background: "var(--bg-void)", border: "1px solid var(--bg-border)" }}
                  >
                    <div>
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider block mb-1"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
                      >
                        Current Hb
                      </span>
                      <span
                        className="text-3xl font-bold tabular-nums leading-none"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", color: statusColor }}
                      >
                        {formatHb(hb)}{" "}
                        <span
                          className="text-[9px] font-normal"
                          style={{ color: "var(--text-dim)" }}
                        >
                          g/dL
                        </span>
                      </span>
                    </div>
                    <div>
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider block mb-1"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
                      >
                        Predicted
                      </span>
                      <span
                        className="text-sm font-bold flex items-center gap-1.5 leading-none pt-2"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-primary)" }}
                      >
                        <Calendar className="w-3.5 h-3.5" style={{ color: "var(--accent-cyan)" }} />
                        {patient.next_transfusion_predicted
                          ? formatDate(patient.next_transfusion_predicted, "MMM dd").toUpperCase()
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        background: isCritical
                          ? "rgba(230, 57, 70, 0.1)"
                          : isWarning
                          ? "rgba(244, 162, 97, 0.1)"
                          : "rgba(82, 183, 136, 0.1)",
                        border: `1px solid ${statusColor}50`,
                        color: statusColor,
                      }}
                    >
                      STATUS: {statusLabel}
                    </span>

                    {patient.alloimmunization_flag ? (
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
                          background: "rgba(244, 162, 97, 0.08)",
                          border: "1px solid rgba(244, 162, 97, 0.3)",
                          color: "var(--accent-amber)",
                        }}
                      >
                        <ShieldAlert className="w-3 h-3 animate-pulse" />
                        CUSUM ALLOIMMUNIZATION
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
                          background: "rgba(0, 180, 216, 0.06)",
                          border: "1px solid rgba(0, 180, 216, 0.25)",
                          color: "var(--accent-cyan)",
                        }}
                      >
                        <Heart className="w-3 h-3" />
                        DECAY STABLE
                      </span>
                    )}

                    <span
                      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        background: `${daysColor}10`,
                        border: `1px solid ${daysColor}50`,
                        color: daysColor,
                      }}
                    >
                      T-{daysLeft} DAYS
                    </span>
                  </div>
                </div>

                {/* Footer CTA */}
                <div
                  className="px-6 py-3 flex justify-end border-t"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    borderColor: "var(--bg-border)",
                  }}
                >
                  <Link
                    href={`/dashboard/patient/${patient.id}`}
                    className="inline-flex items-center gap-1.5 text-[9px] font-bold px-3 py-1.5 rounded-md transition-all uppercase tracking-widest group/link"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      color: "var(--accent-cyan)",
                      background: "rgba(0, 180, 216, 0.06)",
                      border: "1px solid rgba(0, 180, 216, 0.2)",
                    }}
                    aria-label={`View clinical details for ${patient.name}`}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0, 180, 216, 0.15)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0, 180, 216, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0, 180, 216, 0.06)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0, 180, 216, 0.2)";
                    }}
                  >
                    ACCESS NOOR PROFILE
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
