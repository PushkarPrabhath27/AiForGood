"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCityInventory, useApproveMatch } from "@/lib/hooks/useCityInventory";
import { CityBloodMap } from "@/components/grid/CityBloodMap";
import { CityHealthScore } from "@/components/grid/CityHealthScore";
import { BloodBankPanel } from "@/components/grid/BloodBankPanel";
import { InventoryMatchCard } from "@/components/grid/InventoryMatchCard";
import { MatchApprovalFlow } from "@/components/grid/MatchApprovalFlow";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { DEMO } from "@/lib/constants";
import { Activity, ShieldAlert, Sparkles, Map } from "lucide-react";
import { toast } from "sonner";
import type { BloodGroup, TypeCoverage } from "@/../shared/contracts/api.types";
import { BloodWeatherPanel } from "@/components/grid/BloodWeatherPanel";
import { CrossPatientDonorPool } from "@/components/grid/CrossPatientDonorPool";
import { useGuardianCircle } from "@/lib/hooks/useGuardianCircle";

export default function RaktaGridDashboardPage() {
  const cityCode = DEMO.CITY_CODE; // Default HYD
  const { data: response, isLoading, error } = useCityInventory(cityCode);
  const approveMutation = useApproveMatch();

  // Query circle mobilization to determine fallback routing visibility
  const { data: circleResponse } = useGuardianCircle(DEMO.VIKRAM_ID);
  const isMobilizationFailed = circleResponse?.data?.mobilization_status === "failed";

  // State management for clicked blood bank & active matches
  const [selectedBankId, setSelectedBankId] = React.useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = React.useState<string | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = React.useState(false);
  const [showAllMatches, setShowAllMatches] = React.useState(false);
  const queryClient = useQueryClient();

  // Parse API payload values
  const payload = response?.data;
  const bloodBanks = payload?.blood_banks || [];
  const activeMatches = payload?.active_matches || [];
  const coverageByType = (payload?.coverage_by_type || {}) as Record<BloodGroup, TypeCoverage>;
  const cityHealthScore = payload?.city_health_score || 0;
  const healthStatus = payload?.health_status || "green";
  const lastOptimized = payload?.last_optimized_at || new Date().toISOString();

  // Find detailed node for clicked bank
  const selectedBank = React.useMemo(() => {
    if (!selectedBankId) return null;
    return bloodBanks.find((b) => b.id === selectedBankId) || null;
  }, [selectedBankId, bloodBanks]);

  // Extract bank IDs that are currently matching the selected patient (Vikram Reddy)
  const matchedBankIds = React.useMemo(() => {
    return activeMatches.map((m) => m.bank_id);
  }, [activeMatches]);

  // Automatically select a bank if it holds an active match recommendation for Vikram
  React.useEffect(() => {
    if (activeMatches.length > 0 && activeMatches[0] && !selectedBankId) {
      setSelectedBankId(activeMatches[0].bank_id);
    }
  }, [activeMatches, selectedBankId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-900 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-2">
            <LoadingSkeleton variant="chart" />
          </div>
          <div>
            <LoadingSkeleton variant="card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !response?.success || !payload) {
    const errMsg = (error as any)?.message || "Failed to establish synchronization with local bank databases.";
    return <AlertBanner variant="error" title="Grid Connection Offline" message={errMsg} />;
  }

  // Handle Approvals
  const handleMatchClick = (matchId: string) => {
    setActiveMatchId(matchId);
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!activeMatchId) return;

    try {
      await approveMutation.mutateAsync(activeMatchId);
      toast.success("Transfer approved successfully. Stored stock levels decremented.");
      queryClient.invalidateQueries({ queryKey: ["city-inventory", cityCode] });
      setApprovalModalOpen(false);
      setActiveMatchId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to finalize blood transfer.");
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Overview Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Map className="w-8 h-8 text-rose-500" />
            RaktaGrid Supply Intelligence
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Hyderabad Metro Directory · Real-time Extended Phenotype Inter-Bank Exchange
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full text-amber-400 font-semibold shadow-lg shadow-slate-950/20">
          <Activity className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
          OR-Tools routing engine operational
        </div>
      </div>

      {/* Main Grid Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Columns: Map & Health Gauge */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Heatmap Projections */}
          <BloodWeatherPanel cityCode={cityCode} />

          {/* CartoDB Nightwatch Map */}
          <div className="w-full rounded-xl overflow-hidden border border-slate-700 relative" style={{ height: '420px' }}>
            <CityBloodMap
              bloodBanks={bloodBanks}
              matchedBankIds={matchedBankIds}
              selectedBankId={selectedBankId}
              onBankSelect={(id) => setSelectedBankId(id)}
            />
          </div>

          {/* ICU Health Gauge widget */}
          <CityHealthScore
            score={cityHealthScore}
            status={healthStatus}
            coverage={coverageByType}
            lastOptimizedAt={lastOptimized}
          />
        </div>

        {/* Right Pane: Match card & selected stock list */}
        <div className="flex flex-col gap-6 h-full min-h-[600px]">
          
          {/* Vikram's Golden Match card */}
          {(() => {
            const pendingMatches = activeMatches.filter((m) => m.status === "pending");
            const visibleMatches = showAllMatches ? pendingMatches : pendingMatches.slice(0, 5);
            
            return (
              <>
                {pendingMatches.length > 0 && (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
                    {visibleMatches.map((match) => (
                      <InventoryMatchCard
                        key={match.id}
                        match={match}
                        onApprove={handleMatchClick}
                      />
                    ))}
                    {pendingMatches.length > 5 && (
                      <div className="text-center pt-2 pb-1">
                        <button
                          onClick={() => setShowAllMatches((v) => !v)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                        >
                          {showAllMatches ? "Show less" : `Show ${pendingMatches.length - 5} more`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback cross-patient donor pool routing list */}
                {isMobilizationFailed && (
                  <CrossPatientDonorPool
                    cityCode={cityCode}
                    patientId={DEMO.VIKRAM_ID}
                    patientName="Vikram Reddy"
                  />
                )}

                {pendingMatches.length === 0 && (
                  <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-850 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <div className="text-xs">
                      <h4 className="font-bold text-slate-200">No Pending Lifelines</h4>
                      <p className="text-slate-500 font-medium">All patient extended phenotype allocations synced.</p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Detail inventory list panel */}
          <div className="flex-1 min-h-[300px]">
            <BloodBankPanel
              bank={selectedBank}
              hasMatchId={!!selectedBank && matchedBankIds.includes(selectedBank.id)}
            />
          </div>

        </div>

      </div>

      {/* NASA checklist validation overlay */}
      <MatchApprovalFlow
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setActiveMatchId(null);
        }}
        onConfirm={handleConfirmApproval}
        matchId={activeMatchId || ""}
        isMutating={approveMutation.isPending}
      />
    </div>
  );
}
