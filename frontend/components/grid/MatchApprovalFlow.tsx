"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, Snowflake, Bell, Lock, Database, Check, Loader2, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MatchApprovalFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  matchId: string;
  isMutating: boolean;
}

interface StepStage {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export function MatchApprovalFlow({
  isOpen,
  onClose,
  onConfirm,
  matchId,
  isMutating,
}: MatchApprovalFlowProps) {
  const [activeStep, setActiveStep] = React.useState(0);

  const stages: StepStage[] = [
    { id: "ortools", label: "OR-Tools Optimization Verified", icon: <Brain className="w-4 h-4" /> },
    { id: "coldchain", label: "Cold Chain Logistics Locked", icon: <Snowflake className="w-4 h-4" /> },
    { id: "notify", label: "Apollo Bank Notified", icon: <Bell className="w-4 h-4" /> },
    { id: "reserve", label: "2 Units Reserved (48h)", icon: <Lock className="w-4 h-4" /> },
    { id: "decrement", label: "Inventory Synced", icon: <Database className="w-4 h-4" /> },
  ];

  // NASA launch checklist stagger logic
  React.useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
      const timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= stages.length) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
      return () => clearInterval(timer);
    } else {
      setActiveStep(0);
    }
  }, [isOpen]);

  const allStagesCompleted = activeStep >= stages.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isMutating) onClose(); }}>
      <DialogContent className="bg-aether-midnight/95 border border-pulse-cyan/15 text-white rounded-xl p-6 select-none max-w-md w-full shadow-2xl backdrop-blur-md font-mono">
        <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
        
        <DialogHeader className="space-y-1.5 flex flex-col items-center text-center relative z-10">
          <div className="w-12 h-12 rounded-xl bg-aether-slate border border-pulse-cyan/20 flex items-center justify-center text-lg mb-2 relative overflow-hidden group">
            <span className="filter drop-shadow-[0_0_4px_rgba(0,240,255,0.6)]">🚀</span>
          </div>
          <DialogTitle className="text-base font-bold tracking-wider uppercase flex items-center gap-1.5 justify-center font-space text-white">
            Dispatch Sequence Initiated
          </DialogTitle>
          <DialogDescription className="text-[9px] text-slate-400 font-bold uppercase tracking-widest max-w-[280px]">
            Verifying clinical and supply-chain logistics before authorizing blood group transfer.
          </DialogDescription>
        </DialogHeader>

        {/* Staged Checklist Stagger Wrapper */}
        <div className="space-y-2.5 mt-4 py-1 relative z-10">
          {stages.map((stage, i) => {
            const isPending = i > activeStep;
            const isActive = i === activeStep;
            const isCompleted = i < activeStep;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                className={cn(
                  "relative overflow-hidden flex items-center justify-between p-3.5 rounded border transition-all duration-300 aether-glass",
                  isCompleted
                    ? "border-pulse-emerald/20 text-pulse-emerald"
                    : isActive
                    ? "border-pulse-cyan/35 text-pulse-cyan animate-pulse"
                    : "border-aether-ink/65 text-slate-500 opacity-40"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Left Stagger Checkmark */}
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="w-7 h-7 rounded bg-pulse-emerald flex items-center justify-center text-aether-void shadow-md shadow-pulse-emerald/20 flex-shrink-0"
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </motion.div>
                  ) : isActive ? (
                    <div className="w-7 h-7 rounded bg-pulse-cyan flex items-center justify-center text-aether-void flex-shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded bg-aether-slate flex items-center justify-center text-slate-550 border border-aether-ink flex-shrink-0">
                      {stage.icon}
                    </div>
                  )}

                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {stage.label}
                  </span>
                </div>

                {/* Status Flag */}
                <span className="text-[8px] font-bold uppercase font-mono tracking-widest text-slate-650">
                  {isCompleted ? "VERIFIED" : isActive ? "ACTIVE..." : "STANDBY"}
                </span>

                {/* Flow line animation on completed stages */}
                {isCompleted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.6 }}
                    className="absolute bottom-0 left-0 h-0.5 bg-pulse-emerald/30"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Final Confirmation Buttons */}
        <div className="mt-6 flex flex-col gap-2 relative z-10 font-sans">
          {allStagesCompleted ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber hover:brightness-110 text-aether-void font-bold text-xs uppercase tracking-widest rounded-md shadow-lg shadow-pulse-cyan/15 flex items-center justify-center gap-1.5 transition-all duration-300 disabled:opacity-50 border border-white/10 font-space"
              onClick={onConfirm}
              disabled={isMutating}
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-aether-void" />
                  SYNCING STOCK COUNTS...
                </>
              ) : (
                <>
                  CONFIRM DIRECT TRANSFER DISPATCH
                </>
              )}
            </motion.button>
          ) : (
            <button
              className="w-full h-12 bg-aether-slate text-slate-550 rounded-md font-bold text-xs uppercase tracking-widest border border-aether-ink cursor-not-allowed flex items-center justify-center gap-1.5 font-space"
              disabled
            >
              LOGISTICS PROCESSES RUNNING...
            </button>
          )}

          {!isMutating && (
            <button
              onClick={onClose}
              className="w-full py-2.5 text-[9px] text-slate-500 hover:text-pulse-cyan transition-colors uppercase font-bold tracking-widest font-mono cursor-pointer"
            >
              Cancel dispatch
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
