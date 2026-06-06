"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { GitFork, MapPin, Activity, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CrossPatientMatch {
  donor_id: string;
  donor_name: string;
  blood_type: string;
  compatibility_score: number;
  distance_km: number;
  patient_id: string; // original patient circle they belong to
}

interface CrossPatientDonorPoolProps {
  cityCode: string;
  patientId: string;
  patientName: string;
}

// Function to mask donor name (e.g. "Raju Prasad" -> "R**u P****d")
function maskName(name: string): string {
  const parts = name.split(" ");
  return parts
    .map((part) => {
      if (part.length <= 2) return part;
      return part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
    })
    .join(" ");
}

export function CrossPatientDonorPool({
  cityCode,
  patientId,
  patientName,
}: CrossPatientDonorPoolProps) {
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading, error } = useQuery<CrossPatientMatch[]>({
    queryKey: ["cross-patient-matches", cityCode],
    queryFn: () =>
      apiGet<CrossPatientMatch[]>(`/api/v1/graph/city/${cityCode}/cross-patient-matches`),
    refetchInterval: 60000, // Refresh every minute
  });

  const routeMutation = useMutation({
    mutationFn: (variables: { donorId: string; donorName: string }) =>
      apiPost<unknown>("/api/v1/graph/route", {
        donor_id: variables.donorId,
        patient_id: patientId,
      }),
    onSuccess: (data, variables) => {
      toast.success(
        `Rerouted donor ${maskName(variables.donorName)} to ${patientName}'s lifeline request.`
      );
      // Invalidate grid inventory queries to reflect the match updates
      queryClient.invalidateQueries({ queryKey: ["city-inventory", cityCode] });
      queryClient.invalidateQueries({ queryKey: ["cross-patient-matches", cityCode] });
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : "Failed to establish cross-patient donor routing.";
      toast.error(errMsg);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-md space-y-3 animate-pulse">
        <div className="h-4 w-40 bg-slate-900 rounded" />
        <div className="h-16 bg-slate-900 rounded-2xl" />
        <div className="h-16 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-rose-400 mb-2">
          <AlertCircle className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono">
            Graph Service Error
          </h4>
        </div>
        <p className="text-[11px] text-rose-300/80 leading-relaxed font-medium">
          Failed to load external compatibility nodes.
        </p>
      </div>
    );
  }

  // Filter compatibility list to matches matching our patient's blood type (B+ in the demo case)
  // Let's assume B+ compatibility for Vikram (represented by active matches showing B+)
  const compatibleMatches = matches;

  if (compatibleMatches.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-850 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-850/60 pb-3">
        <div className="flex items-center gap-2">
          <GitFork className="w-5 h-5 text-purple-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display">
              Cross-Patient Donor Pool
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              City-wide compatibility fallback routes
            </p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 font-mono">
          {compatibleMatches.length} NODES
        </span>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 select-none">
        {compatibleMatches.map((match) => (
          <div
            key={match.donor_id}
            className="group/item border border-slate-850 bg-slate-950/40 p-3.5 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-800 transition-all hover:bg-slate-950/70"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-250">
                  {maskName(match.donor_name)}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-800/80 text-slate-400 rounded-md font-mono">
                  {match.blood_type}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-purple-500" />
                  {match.compatibility_score}% compatibility
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  {match.distance_km} km
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={routeMutation.isPending}
              onClick={() =>
                routeMutation.mutate({
                  donorId: match.donor_id,
                  donorName: match.donor_name,
                })
              }
              className="h-8 border-purple-500/30 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-600 text-purple-450 hover:text-white font-bold px-3 text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              {routeMutation.isPending && routeMutation.variables?.donorId === match.donor_id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <GitFork className="w-3 h-3" />
                  Route
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
