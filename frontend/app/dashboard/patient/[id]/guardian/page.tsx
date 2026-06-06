"use client";

import * as React from "react";
import { usePatient } from "@/lib/hooks/usePatient";
import { useGuardianCircle } from "@/lib/hooks/useGuardianCircle";
import { GuardianConstellation } from "@/components/guardian/GuardianConstellation";
import { GuardianCard } from "@/components/guardian/GuardianCard";
import { CircleHealthBar } from "@/components/guardian/CircleHealthBar";
import { MobilizationStatus } from "@/components/guardian/MobilizationStatus";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { PageHeader } from "@/components/shared/PageHeader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { PatientDetail, GuardianCircleResponse, Guardian } from "@/../shared/contracts/api.types";

interface GuardianPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientGuardianPage({ params }: GuardianPageProps) {
  const { id } = React.use(params);
  const [selectedGuardian, setSelectedGuardian] = React.useState<Guardian | null>(null);

  // React Query queries fetching actual profile & donor networks
  const {
    data: patientResponse,
    isLoading: patientLoading,
    error: patientError,
  } = usePatient(id);

  const {
    data: circleResponse,
    isLoading: circleLoading,
    error: circleError,
  } = useGuardianCircle(id);

  const isLoading = patientLoading || circleLoading;
  const isError = patientError || circleError;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-10 w-24 bg-slate-900 rounded-xl mb-4" />
        <LoadingSkeleton variant="text" lines={2} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton variant="card" className="h-28" />
          <LoadingSkeleton variant="card" className="h-28" />
          <LoadingSkeleton variant="card" className="h-28" />
        </div>
        <LoadingSkeleton variant="chart" className="h-[400px]" />
      </div>
    );
  }

  if (isError || !patientResponse?.data || !circleResponse?.data) {
    const errMsg =
      (patientError as any)?.message ||
      (circleError as any)?.message ||
      "Failed to fetch clinical records from Niloufer database.";
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/patient/${id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient Clinical Brain
        </Link>
        <AlertBanner variant="error" title="Guardian Network Offline" message={errMsg} />
      </div>
    );
  }

  const patient = patientResponse.data as PatientDetail;
  const circle = circleResponse.data as GuardianCircleResponse;

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/patient/${patient.id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-450 hover:text-slate-200 group transition-colors"
          aria-label="Back to Biometric Forecast"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
          Back to Biometric Forecast
        </Link>

        {/* RaktaMitra chip */}
        <span
          className="text-[9px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            background: "rgba(82, 183, 136, 0.08)",
            border: "1px solid rgba(82, 183, 136, 0.3)",
            color: "var(--accent-emerald)",
          }}
        >
          ● RAKTAMITRA NETWORK ACTIVE
        </span>
      </div>

      {/* Segmented tab navigation */}
      <div
        className="flex gap-8 pb-3 border-b relative"
        style={{ borderColor: "var(--bg-border)" }}
      >
        <div className="flex flex-col items-center relative">
          <Link
            href={`/dashboard/patient/${patient.id}`}
            className="text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
          >
            Biometric Forecast
          </Link>
        </div>
        <div className="flex flex-col items-center relative">
          <Link
            href={`/dashboard/patient/${patient.id}/guardian`}
            className="text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
          >
            Guardian Network
          </Link>
          <span
            className="w-1.5 h-1.5 rounded-full mt-1 absolute -bottom-[15px] z-10"
            style={{ background: "var(--accent-cyan)", boxShadow: "0 0 8px rgba(0, 180, 216, 0.8)" }}
          />
        </div>
      </div>

      {/* Dynamic layouts */}
      <PageHeader
        title={`${patient.name} · Guardian Network`}
        subtitle="Monitor permanent relationship circle assets and WhatsApp SMS mobilization campaigns."
      />

      {/* Stepper details */}
      <MobilizationStatus
        status={circle.mobilization_status}
        daysToTransfusion={circle.days_to_transfusion}
      />

      {/* Three radial score indicators */}
      <CircleHealthBar
        coverage={circle.coverage_score}
        engagement={circle.engagement_score}
        resilience={circle.resilience_score}
      />

      {/* Core central SVG star geometry constellation */}
      <div className="py-6 flex justify-center items-center">
        <GuardianConstellation
          patientName={patient.name}
          guardians={circle.guardians}
          onNodeClick={(g) => setSelectedGuardian(g)}
        />
      </div>

      {/* Sliding Sheet Details Panel */}
      <GuardianCard
        guardian={selectedGuardian}
        patientName={patient.name}
        patientId={patient.id}
        open={!!selectedGuardian}
        onClose={() => setSelectedGuardian(null)}
      />
    </div>
  );
}
