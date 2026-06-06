"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import { useGuardianCircle } from "@/lib/hooks/useGuardianCircle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Heart, UserMinus, RefreshCw, UserCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { PatientStatus } from "@/types";

interface PatientStatusPanelProps {
  patientId: string;
  currentStatus: PatientStatus;
  onStatusChangeSuccess?: () => void;
}

const STATUS_CONFIG = {
  active: {
    label: "Active Care",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/35",
    icon: <UserCheck className="w-3.5 h-3.5" />,
  },
  inactive: {
    label: "Inactive / Hold",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/35",
    icon: <UserMinus className="w-3.5 h-3.5" />,
  },
  deceased: {
    label: "Deceased",
    color: "bg-slate-800/40 text-slate-400 border-slate-700",
    icon: <Heart className="w-3.5 h-3.5 text-slate-500" />,
  },
  transferred: {
    label: "Transferred Out",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/35",
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />,
  },
};

export function PatientStatusPanel({
  patientId,
  currentStatus,
  onStatusChangeSuccess,
}: PatientStatusPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<PatientStatus>(currentStatus);

  // Fetch guardian circle to get the dynamic count of guardians who will receive messages
  const { data: circleResponse } = useGuardianCircle(patientId);
  const guardianCount = circleResponse?.data?.guardians?.length ?? 8; // Fallback to 8

  const updateMutation = useMutation({
    mutationFn: (newStatus: PatientStatus) =>
      apiPost<unknown>(`/api/v1/patients/${patientId}/status`, { status: newStatus }),
    onSuccess: (data, newStatus) => {
      if (newStatus === "deceased") {
        toast.success(
          "Grief Protocol successfully initiated. Memorial & transition broadcasts dispatched."
        );
      } else {
        toast.success(`Patient status updated to ${newStatus}.`);
      }
      // Invalidate patient data query key to reload state
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setOpen(false);
      if (onStatusChangeSuccess) onStatusChangeSuccess();
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : "Failed to update patient status.";
      toast.error(errMsg);
    },
  });

  const handleStatusSelect = (status: PatientStatus) => {
    setSelectedStatus(status);
    setOpen(true);
  };

  const handleConfirm = () => {
    updateMutation.mutate(selectedStatus);
  };

  const isDeceasedWarning = selectedStatus === "deceased";

  return (
    <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 px-4 py-2 rounded-2xl select-none">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
          Clinical Status
        </span>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
            STATUS_CONFIG[currentStatus]?.color || STATUS_CONFIG.active.color
          }`}
        >
          {STATUS_CONFIG[currentStatus]?.icon}
          {STATUS_CONFIG[currentStatus]?.label || currentStatus}
        </div>
      </div>

      <div className="h-6 w-[1px] bg-slate-850 self-center mx-1" />

      {/* Select buttons for updating status */}
      <div className="flex gap-1.5">
        {(["active", "inactive", "transferred", "deceased"] as PatientStatus[]).map((status) => {
          if (status === currentStatus) return null;
          return (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => handleStatusSelect(status)}
              className="h-7 px-2.5 border-slate-850 hover:border-slate-700 bg-slate-900/40 text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer hover:bg-slate-900 transition-colors"
            >
              {status === "deceased" ? "Mark Deceased" : status}
            </Button>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0b0b12] border border-slate-800 text-slate-100 p-6 sm:max-w-md rounded-2xl select-none">
          <DialogHeader className="space-y-2.5">
            <DialogTitle className="text-base font-extrabold uppercase tracking-wide flex items-center gap-2">
              {isDeceasedWarning ? (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                  <span className="text-rose-500 font-display">Warning: Grief Protocol</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span className="text-slate-200 font-display">Confirm Status Change</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium leading-relaxed">
              {isDeceasedWarning ? (
                <>
                  You are about to mark this patient as <span className="font-bold text-slate-100 uppercase">Deceased</span>.
                  <br />
                  <span className="block mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-350">
                    ⚠ <strong>Critical Action:</strong> This will immediately trigger the Grief Protocol for all **{guardianCount} guardians** in the patient's Living Circle. Automated memorial notifications and consent verification campaigns will be dispatched. This action cannot be reversed.
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to transition the patient's status from{" "}
                  <span className="font-bold text-slate-300 capitalize">{currentStatus}</span> to{" "}
                  <span className="font-bold text-slate-200 capitalize">{selectedStatus}</span>? This will modify active donor eligibility and warning thresholds.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex justify-end gap-3 border-t border-slate-850 pt-4">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-slate-450 hover:text-slate-200 h-9 rounded-xl hover:bg-slate-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={updateMutation.isPending}
              className={`h-9 font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${
                isDeceasedWarning
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {updateMutation.isPending ? "Updating..." : "Confirm & Commit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
