"use client";

import * as React from "react";
import { usePatient } from "@/lib/hooks/usePatient";
import { useForecast } from "@/lib/hooks/useForecast";
import { PatientHeader } from "@/components/noor/PatientHeader";
import { ForecastSummary } from "@/components/noor/ForecastSummary";
import { HbForecastChart } from "@/components/noor/HbForecastChart";
import { ClinicalAlerts } from "@/components/noor/ClinicalAlerts";
import { TransfusionTimeline } from "@/components/noor/TransfusionTimeline";
import { HbReadingForm } from "@/components/noor/HbReadingForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { SentinelPanel } from "@/components/sentinel/SentinelPanel";
import { PatientStatusPanel } from "@/components/patient/PatientStatusPanel";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { PatientDetail, ForecastResponse } from "@/../shared/contracts/api.types";

interface PatientDetailClientProps {
  id: string;
}

export function PatientDetailClient({ id }: PatientDetailClientProps) {
  // React Query queries fetching actual profile & prediction curves
  const {
    data: patientResponse,
    isLoading: patientLoading,
    error: patientError,
  } = usePatient(id);

  const {
    data: forecastResponse,
    isLoading: forecastLoading,
    error: forecastError,
  } = useForecast(id);

  const isLoading = patientLoading || forecastLoading;
  const isError = patientError || forecastError;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 w-24 bg-slate-900 rounded-xl mb-4" />
        <LoadingSkeleton variant="text" lines={2} />
        <LoadingSkeleton variant="card" className="h-28" />
        <LoadingSkeleton variant="chart" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="table" />
        </div>
      </div>
    );
  }

  if (isError || !patientResponse?.data) {
    const errMsg =
      (patientError as any)?.message ||
      (forecastError as any)?.message ||
      "Failed to fetch clinical records from Niloufer database.";
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>
        <AlertBanner variant="error" title="Clinical Sync Failed" message={errMsg} />
      </div>
    );
  }

  const patient = patientResponse.data as PatientDetail;
  const forecast = forecastResponse?.data as ForecastResponse | null;

  const forecastUnavailable = !forecast?.predicted_transfusion_date;

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-450 hover:text-slate-200 group transition-colors"
          aria-label="Back to Patients overview"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
          Back to Overview
        </Link>
        
        <div className="flex flex-wrap items-center gap-3">
          <PatientStatusPanel patientId={patient.id} currentStatus={patient.status} />
          {/* Dynamic floating Hb reading dialog */}
          <HbReadingForm patientId={patient.id} />
        </div>
      </div>

      {/* Segmented tab navigation */}
      <div
        className="flex gap-8 pb-3 border-b relative mb-6"
        style={{ borderColor: "var(--bg-border)" }}
      >
        <div className="flex flex-col items-center relative">
          <Link
            href={`/dashboard/patient/${patient.id}`}
            className="text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
          >
            Biometric Forecast
          </Link>
          <span
            className="w-1.5 h-1.5 rounded-full mt-1 absolute -bottom-[15px] z-10"
            style={{ background: "var(--accent-cyan)", boxShadow: "0 0 8px rgba(0, 180, 216, 0.8)" }}
          />
        </div>
        <div className="flex flex-col items-center relative">
          <Link
            href={`/dashboard/patient/${patient.id}/guardian`}
            className="text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
          >
            Guardian Network
          </Link>
        </div>
      </div>

      {/* Patient demographics and stats badges */}
      <PatientHeader
        patient={patient}
        currentHb={patient.hb_current}
        nextTransfusion={forecast?.predicted_transfusion_date ?? null}
        confidencePct={forecast?.confidence_pct ?? null}
      />

      {forecastUnavailable ? (
        <AlertBanner
          variant="info"
          title="Insufficient Data for Forecasting"
          message="At least 3 Hb readings are required to generate a forecast. Log a new reading to start building the prediction model."
        />
      ) : (
        <>
          {/* Pulsing countdown summary card */}
          <ForecastSummary
            predictedDate={forecast!.predicted_transfusion_date}
            confidenceLower={forecast!.confidence_lower}
            confidenceUpper={forecast!.confidence_upper}
            confidencePct={forecast!.confidence_pct}
          />

          {/* Large Recharts sawtooth graph */}
          <HbForecastChart
            historical={forecast!.historical_readings}
            forecast={forecast!.forecast_points}
            threshold={7.0}
            predictedDate={forecast!.predicted_transfusion_date}
          />
        </>
      )}

      {/* Expandable Alert panels and Cycle ledgers side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Expandable Alert List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            System Diagnostics
          </h3>
          <ClinicalAlerts alerts={forecast?.alert_flags ?? []} />
          <SentinelPanel patientId={patient.id} />
        </div>

        {/* Historical Spikes ledger */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            Transfusion Archive
          </h3>
          <TransfusionTimeline readings={forecast?.historical_readings ?? []} />
        </div>
      </div>
    </div>
  );
}
