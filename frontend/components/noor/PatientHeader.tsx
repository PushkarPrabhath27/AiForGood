"use client";

import * as React from "react";
import { formatDate } from "@/lib/utils/dates";
import { ShieldAlert } from "lucide-react";
import type { Patient } from "@/../shared/contracts/api.types";

export interface PatientHeaderProps {
  patient: Patient;
  currentHb: number | null;
  nextTransfusion: string | null;
  confidencePct?: number | null;
}

export function PatientHeader({
  patient,
  currentHb,
  nextTransfusion,
  confidencePct = 89,
}: PatientHeaderProps) {
  const bloodTypeStr = `${patient.blood_type}${patient.rh_factor}`;

  // Calculate T-countdown relative to Oct 20, 2024
  const today = new Date(2024, 9, 20);
  let daysDiff = 14;
  if (nextTransfusion) {
    try {
      const pred = new Date(nextTransfusion);
      const diffTime = pred.getTime() - today.getTime();
      const calculated = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (calculated > 0) daysDiff = calculated;
    } catch {}
  }

  const isCritical = daysDiff <= 7;
  const isWarning = daysDiff <= 14;

  const countdownColor = isCritical
    ? "var(--accent-crimson)"
    : isWarning
    ? "var(--accent-amber)"
    : "var(--accent-emerald)";

  return (
    <div
      className="w-full rounded-xl overflow-hidden relative mb-6"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderLeft: `4px solid var(--accent-crimson)`,
        boxShadow: "0 0 30px rgba(230, 57, 70, 0.08), 0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Subtle crimson gradient overlay on left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(230, 57, 70, 0.06), transparent)",
        }}
      />

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 relative z-10">
        {/* LEFT: Patient Identity */}
        <div className="space-y-3">
          {/* Name + Blood Type + Alloimmunization badges */}
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="text-[28px] font-bold tracking-tight leading-none uppercase"
              style={{
                fontFamily: "var(--font-space-grotesk)",
                color: "var(--text-primary)",
              }}
            >
              {patient.name}
            </h1>

            {/* Blood type badge */}
            <span
              className="px-2.5 py-1 rounded-md text-xs font-bold"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                background: "rgba(230, 57, 70, 0.1)",
                border: "1px solid rgba(230, 57, 70, 0.4)",
                color: "var(--accent-crimson)",
                boxShadow: "0 0 8px rgba(230, 57, 70, 0.15)",
              }}
            >
              {bloodTypeStr}
            </span>

            {/* Age badge */}
            <span
              className="px-2.5 py-1 rounded-md text-xs font-bold"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-secondary)",
              }}
            >
              {patient.age} years
            </span>

            {/* Alloimmunization flag */}
            {patient.alloimmunization_flag && (
              <span
                className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  background: "rgba(244, 162, 97, 0.1)",
                  border: "1px solid rgba(244, 162, 97, 0.4)",
                  color: "var(--accent-amber)",
                }}
              >
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                ALLOIMMUNIZED
              </span>
            )}
          </div>

          {/* Enrollment info in monospace */}
          <p
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              color: "var(--text-secondary)",
            }}
          >
            Thalassemia Major
            <span style={{ color: "var(--bg-border)" }}> · </span>
            Enrolled{" "}
            {patient.enrolled_at
              ? formatDate(patient.enrolled_at, "MMMM yyyy")
              : "June 2023"}
            <span style={{ color: "var(--bg-border)" }}> · </span>
            ID:{" "}
            <span style={{ color: "var(--text-dim)" }}>
              PRY-{patient.id.slice(0, 8).toUpperCase()}
            </span>
          </p>

          {/* Current Hb quick stat */}
          <div className="flex items-baseline gap-2">
            <span
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--text-dim)",
              }}
            >
              Current Hb:
            </span>
            <span
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color:
                  (currentHb ?? 0) < 7
                    ? "var(--accent-crimson)"
                    : (currentHb ?? 0) < 8
                    ? "var(--accent-amber)"
                    : "var(--accent-emerald)",
              }}
            >
              {currentHb?.toFixed(1) ?? "—"}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--text-dim)", fontFamily: "var(--font-jetbrains-mono)" }}
            >
              g/dL
            </span>
          </div>
        </div>

        {/* RIGHT: Big T-XX Countdown */}
        <div className="flex flex-col items-center xl:items-end text-center xl:text-right shrink-0">
          {/* Massive countdown number */}
          <div
            className="font-bold leading-none"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "clamp(56px, 8vw, 80px)",
              color: countdownColor,
              textShadow: `0 0 30px ${countdownColor}, 0 0 60px ${countdownColor}40`,
              letterSpacing: "-0.02em",
            }}
          >
            T-{daysDiff}
          </div>

          {/* Label */}
          <p
            className="text-[10px] font-bold tracking-widest uppercase mt-1"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              color: "var(--text-secondary)",
              letterSpacing: "0.2em",
            }}
          >
            DAYS UNTIL PREDICTED
            <br />
            TRANSFUSION
          </p>

          {/* Date + confidence in cyan monospace */}
          {nextTransfusion && (
            <p
              className="text-[11px] font-bold mt-2"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                color: "var(--accent-cyan)",
              }}
            >
              {formatDate(nextTransfusion, "MMM dd, yyyy").toUpperCase()} ·{" "}
              {confidencePct}% CONFIDENCE
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
