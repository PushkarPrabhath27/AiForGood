"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, Check, X, MapPin, ShieldAlert, Sparkle, Loader2 } from "lucide-react";
import type { InventoryMatch } from "@/../shared/contracts/api.types";
import { cn } from "@/lib/utils/cn";

export interface InventoryMatchCardProps {
  match: InventoryMatch;
  onApprove: (matchId: string) => void;
}

export function InventoryMatchCard({ match, onApprove }: InventoryMatchCardProps) {
  const [isPending, setIsPending] = React.useState(false);

  // Parse expiry date to short readable text
  const expiryString = React.useMemo(() => {
    try {
      return new Date(match.expiry_date).toLocaleDateString([], {
        month: "short",
        day: "2-digit",
      });
    } catch {
      return "Nov 05";
    }
  }, [match.expiry_date]);

  const isApproved = match.status === "approved";

  const handleTriggerApprove = async () => {
    setIsPending(true);
    // Simulate loading optimization spinner
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsPending(false);
    onApprove(match.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative overflow-hidden bg-gradient-to-b from-aether-midnight to-aether-void aether-glass border border-pulse-cyan/15 border-t-2 border-t-pulse-amber rounded-xl p-6 select-none shadow-2xl w-full"
    >
      {/* Drifting neural mesh overlay underneath */}
      <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />

      {/* Urgency Badge (Hollow, thin borders) */}
      <div className="absolute top-4 right-4 z-20">
        {isApproved ? (
          <Badge className="bg-aether-void border border-pulse-emerald/35 text-pulse-emerald font-bold uppercase text-[9px] rounded font-mono tracking-widest shadow-[0_0_8px_rgba(6,255,165,0.15)]">
            <Check className="w-3.5 h-3.5 mr-1" />
            TRANSFER APPROVED
          </Badge>
        ) : (
          <Badge className="bg-aether-void border border-pulse-magenta/35 text-pulse-magenta font-bold uppercase text-[9px] rounded font-mono tracking-widest animate-pulse flex items-center gap-1 shadow-[0_0_8px_rgba(255,0,110,0.15)]">
            <AlertTriangle className="w-3 h-3 text-pulse-magenta" />
            URGENT · {match.days_until_expiry} DAYS TO EXPIRY
          </Badge>
        )}
      </div>

      {/* Patient demographics info: Space Grotesk and life-rose */}
      <div className="flex items-center gap-3 mb-5 mt-2">
        <div className="w-12 h-12 rounded-xl bg-aether-slate border border-pulse-cyan/25 flex items-center justify-center flex-shrink-0 text-xl shadow-lg relative overflow-hidden">
          <span className="filter drop-shadow-[0_0_4px_rgba(0,240,255,0.5)]">🩸</span>
        </div>
        <div className="space-y-0.5 font-mono">
          <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest block">
            Target Matching Patient
          </span>
          {/* Vikram Reddy in Space Grotesk & life-rose */}
          <h3 className="font-bold text-life-rose text-lg leading-none font-space uppercase">
            {match.patient_name}
          </h3>
          <p className="text-pulse-cyan text-[9px] font-bold uppercase tracking-widest">
            {match.blood_group} · KELL-NEGATIVE · ALLOIMMUNIZED
          </p>
        </div>
      </div>

      {/* Grid details block: monospace values */}
      <div className="grid grid-cols-2 gap-4 mb-5 font-mono">
        <div className="p-3.5 rounded-md bg-aether-void/60 border border-aether-ink space-y-1 relative">
          <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest block leading-none">
            Origin Bank Node
          </span>
          <p className="font-bold text-xs text-white leading-tight uppercase">
            {match.bank_name}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[8px] text-slate-400 font-bold uppercase">
            <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
            {match.distance_km} km away
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-aether-void/60 border border-aether-ink space-y-1">
          <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest block leading-none">
            Matching Reserves
          </span>
          <p className="font-bold text-xl text-pulse-cyan leading-none">
            {match.units_available} <span className="text-[10px] text-slate-400 font-semibold tracking-normal lowercase">Units</span>
          </p>
          {/* Countdown progress bar inside matching reserves */}
          <div className="space-y-1 mt-1.5">
            <div className="w-full h-1 bg-aether-void border border-aether-ink rounded-full overflow-hidden">
              <div 
                className="h-full bg-pulse-amber rounded-full shadow-[0_0_8px_rgba(255,183,3,0.8)]"
                style={{ width: `${Math.max(10, 100 - (match.days_until_expiry * 10))}%` }}
              />
            </div>
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest leading-none">
              EXPIRATION: {expiryString.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Recommended intelligence alert box */}
      <div className="p-3.5 rounded-md bg-pulse-cyan/5 border border-pulse-cyan/15 mb-5 flex gap-2 font-mono uppercase tracking-wider text-[9px]">
        <Sparkles className="w-4 h-4 text-pulse-cyan flex-shrink-0 mt-0.5" />
        <p className="text-pulse-cyan font-bold leading-relaxed">
          {match.recommended_action}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 font-mono">
        {isApproved ? (
          <div className="w-full py-3.5 rounded-md bg-pulse-emerald/10 border border-pulse-emerald/25 flex items-center justify-center gap-1.5 text-[10px] text-pulse-emerald font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(6,255,165,0.08)]">
            <ShieldAlert className="w-4 h-4" />
            TRANSFER LOGISTICS INITIATED
          </div>
        ) : (
          <>
            <button
              onClick={handleTriggerApprove}
              disabled={isPending}
              className="flex-1 rounded-md h-12 bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber hover:brightness-110 text-aether-void font-bold text-xs uppercase tracking-wider shadow-lg shadow-pulse-cyan/15 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              aria-label="Approve target inventory transfer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-aether-void" />
                  CONFIRMING OR-TOOLS MATRIX...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  INITIATE TRANSFER →
                </>
              )}
            </button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-md border-aether-ink bg-aether-void/20 text-slate-500 hover:text-white hover:bg-aether-slate cursor-pointer"
              aria-label="Decline match recommendation"
            >
              <X className="w-4.5 h-4.5" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
