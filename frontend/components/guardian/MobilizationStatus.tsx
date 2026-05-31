"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MobilizationStatus as MobilizationStatusType } from "@/../shared/contracts/api.types";

export interface MobilizationStatusProps {
  status: MobilizationStatusType;
  daysToTransfusion: number | null;
}

interface StepConfig {
  label: string;
  days: number;
  description: string;
}

const stepperSteps: StepConfig[] = [
  { label: "T-14", days: 14, description: "Circle standby" },
  { label: "T-10", days: 10, description: "Soft asks sent" },
  { label: "T-7", days: 7, description: "Confirmations" },
  { label: "T-3", days: 3, description: "Final logistics" },
  { label: "T-0", days: 0, description: "Transfusion active" },
];

export function MobilizationStatus({
  status,
  daysToTransfusion,
}: MobilizationStatusProps) {
  // Compute active step index based on daysToTransfusion or confirmation status
  const currentStepIndex = React.useMemo(() => {
    if (status === "confirmed") return 5; // All completed!
    if (daysToTransfusion === null) return 0;
    
    if (daysToTransfusion >= 14) return 0;
    if (daysToTransfusion >= 10) return 1;
    if (daysToTransfusion >= 7) return 2;
    if (daysToTransfusion >= 3) return 3;
    return 4;
  }, [status, daysToTransfusion]);

  return (
    <Card className="bg-gradient-to-b from-bg-secondary to-bg-tertiary aether-glass border border-bg-hover rounded-xl p-6 select-none shadow-2xl w-full relative overflow-hidden">
      <div className="absolute inset-0 neural-mesh opacity-[0.01] pointer-events-none" />
      
      <CardContent className="p-0 space-y-6 relative z-10 font-sans">
        {/* Banner Alert Countdown */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-primary border border-accent-cyan/20 flex items-center justify-center text-accent-cyan flex-shrink-0 animate-pulse shadow-md">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-500 block leading-none tracking-widest font-mono">
              MOBILIZATION SEQUENCE
            </span>
            <h4 className="text-sm font-semibold text-slate-200 tracking-tight mt-0.5">
              {status === "confirmed" ? (
                <span className="text-accent-teal flex items-center gap-1.5 leading-none font-bold">
                  <Sparkles className="w-4 h-4 text-accent-teal animate-bounce" />
                  All 8 of 8 guardians active — Transfusion Prepared
                </span>
              ) : (
                `Campaign Active — Targeting T-${daysToTransfusion ?? 14} Transfusion Window`
              )}
            </h4>
          </div>
        </div>

        {/* Stepper Progress bar visual layout */}
        <div className="relative flex justify-between items-center w-full px-2 pt-1 pb-4">
          {/* Connector Track Bar Background */}
          <div className="absolute top-6 left-8 right-8 h-0.5 bg-bg-hover z-0 rounded-full" />
          {/* Active Progress Connector (gradient from blue to cyan) */}
          <div
            className="absolute top-6 left-8 h-0.5 bg-gradient-to-r from-accent-blue to-accent-cyan z-0 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            style={{
              width: `${Math.min(100, Math.max(0, (currentStepIndex / 4) * 88))}%`,
            }}
          />

          {stepperSteps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div key={index} className="flex flex-col items-center z-10 relative">
                {/* Stepper Node Bubble */}
                {isActive ? (
                  /* Active step - heartbeat pulsing animation in cyan */
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center bg-accent-cyan text-bg-primary shadow-[0_0_15px_rgba(6,182,212,0.6)] cursor-pointer border border-accent-cyan"
                  >
                    <span className="font-bold text-xs font-mono">{step.label}</span>
                    <div className="absolute inset-0 rounded-full border border-accent-cyan animate-ping opacity-30" />
                  </motion.div>
                ) : isCompleted ? (
                  /* Completed step - draws checkmark in */
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-bg-primary border-2 border-accent-cyan shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                    <svg width="14" height="14" viewBox="0 0 20 20" className="select-none pointer-events-none">
                      <motion.path
                        d="M4 10 L8 14 L16 6"
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      />
                    </svg>
                  </div>
                ) : (
                  /* Pending step - slate circle, outlined border */
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-bg-primary border-2 border-slate-700 text-slate-500 text-xs font-bold font-mono transition-all duration-200">
                    {step.label}
                  </div>
                )}

                {/* Subtext description labels in sentence case */}
                <div className="mt-3 text-center max-w-[85px]">
                  <span
                    className={cn(
                      "text-[10px] font-bold block leading-tight transition-colors duration-200 font-mono",
                      isActive ? "text-accent-cyan" : isCompleted ? "text-accent-cyan/80" : "text-slate-500"
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-medium leading-tight block mt-1 whitespace-pre-wrap transition-colors duration-200",
                      isActive ? "text-slate-200 font-bold" : isCompleted ? "text-slate-400" : "text-slate-600"
                    )}
                  >
                    {step.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
