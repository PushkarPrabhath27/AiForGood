"use client";

import * as React from "react";
import { formatHb, formatConfidence } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Percent, ShieldAlert, Cpu, Timer } from "lucide-react";
import type { Patient } from "@/../shared/contracts/api.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

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
  const isPriya = patient.name.includes("Priya");

  // Calculate dynamic T-countdown relative to Oct 20, 2024 today
  const today = new Date(2024, 9, 20);
  let daysDiff = isPriya ? 14 : 18;
  if (nextTransfusion) {
    try {
      const pred = new Date(nextTransfusion);
      const diffTime = pred.getTime() - today.getTime();
      const calculated = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (calculated > 0) daysDiff = calculated;
    } catch {}
  }

  // Circular gauge calculations
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (circumference * (confidencePct ?? 89)) / 100;

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full pb-6 border-b border-aether-ink mb-6">
      
      {/* Left Details: Space Grotesk title & life-rose colors */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-white leading-none font-space uppercase">
            {patient.name}
          </h1>
          <Badge className="bg-aether-void border border-pulse-cyan/35 text-pulse-cyan font-bold font-mono text-xs uppercase py-0.5 px-2.5 rounded shadow-[0_0_8px_rgba(0,240,255,0.15)]">
            {bloodTypeStr}
          </Badge>
          {patient.alloimmunization_flag && (
            <Badge className="bg-aether-void border border-pulse-amber/35 text-pulse-amber font-bold font-mono text-xs uppercase py-0.5 px-2.5 rounded flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              Alloimmunized
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-pulse-cyan font-bold font-mono uppercase tracking-widest">
          Age: {patient.age} years · ID: <span className="font-mono text-slate-500">{patient.id}</span> · Niloufer Children's Hospital
        </p>
      </div>      {/* Right Metric Cards: 4 glass mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:w-auto w-full">
        
        {/* Metric 1: Current Hb */}
        <Card className="bg-bg-secondary/70 aether-glass border-t-2 border-t-accent-emerald border-x-0 border-b-0 rounded-lg flex-1 select-none shadow-lg transition-transform hover:-translate-y-0.5 duration-200">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-80 block mb-1.5 font-mono">
              Current Hb
            </span>
            <span className="text-3xl font-bold font-mono tracking-tight text-accent-emerald leading-none">
              {formatHb(currentHb ?? patient.hb_current ?? 0)} <span className="text-[10px] font-normal text-slate-500 lowercase tracking-normal">g/dL</span>
            </span>
          </CardContent>
        </Card>

        {/* Metric 2: Forecasted Date */}
        <Card className="bg-bg-secondary/70 aether-glass border-t-2 border-t-accent-blue border-x-0 border-b-0 rounded-lg flex-1 select-none shadow-lg transition-transform hover:-translate-y-0.5 duration-200">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-80 block font-mono">
                Forecasted
              </span>
              <Calendar className="w-4 h-4 text-accent-blue" />
            </div>
            <span className="text-3xl font-bold font-mono tracking-tight text-white leading-none">
              {nextTransfusion ? formatDate(nextTransfusion, "MMM dd").toUpperCase() : "N/A"}
            </span>
          </CardContent>
        </Card>

        {/* Metric 3: Confidence circular mini-gauge */}
        <Card className="bg-bg-secondary/70 aether-glass border-t-2 border-t-accent-cyan border-x-0 border-b-0 rounded-lg flex-1 select-none shadow-lg transition-transform hover:-translate-y-0.5 duration-200">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-80 block font-mono">
                Confidence
              </span>
              {/* Mini SVG Circular progress circle */}
              <svg className="w-4 h-4 transform -rotate-90 flex-shrink-0" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
                <circle 
                  cx="18" 
                  cy="18" 
                  r={radius} 
                  fill="none" 
                  stroke="#06B6D4" 
                  strokeWidth="4" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>
            <span className="text-3xl font-bold font-mono tracking-tight text-accent-cyan leading-none">
              {confidencePct}%
            </span>
          </CardContent>
        </Card>

        {/* Metric 4: Time to Trigger */}
        <Card className={cn(
          "bg-bg-secondary/70 aether-glass border-t-2 border-t-accent-rose border-x-0 border-b-0 rounded-lg flex-1 select-none shadow-lg transition-transform hover:-translate-y-0.5 duration-200",
          daysDiff < 7 ? "animate-pulse" : ""
        )}>
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-80 block font-mono">
                Trigger Timer
              </span>
              <Timer className={cn("w-4 h-4 text-accent-rose", daysDiff < 7 ? "animate-pulse" : "")} />
            </div>
            <span className="text-3xl font-bold font-mono tracking-tight text-accent-rose leading-none uppercase">
              T-{daysDiff} Days
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
