"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, Check, X, MapPin, ShieldAlert, Sparkle, Loader2 } from "lucide-react";
import type { InventoryMatch } from "@/../shared/contracts/api.types";
import { cn } from "@/lib/utils/cn";
import confetti from "canvas-confetti";

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
    
    // Theatrical Confetti Burst
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#00ff88", "#dc143c", "#00d4ff"],
      disableForReducedMotion: true
    });

    onApprove(match.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative overflow-hidden rounded-xl p-6 select-none shadow-2xl w-full"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderTop: "3px solid var(--accent-amber)",
      }}
    >
      {/* Drifting neural mesh overlay underneath */}
      <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />

      {/* Urgency Badge (Hollow, thin borders) */}
      <div className="absolute top-4 right-4 z-20">
        {isApproved ? (
          <span
            className="px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              background: "rgba(82, 183, 136, 0.1)",
              border: "1px solid rgba(82, 183, 136, 0.4)",
              color: "var(--accent-emerald)",
              boxShadow: "0 0 8px rgba(82, 183, 136, 0.2)",
            }}
          >
            <Check className="w-3.5 h-3.5" />
            TRANSFER APPROVED
          </span>
        ) : (
          <span
            className="px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5 animate-pulse"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              background: "rgba(230, 57, 70, 0.1)",
              border: "1px solid rgba(230, 57, 70, 0.4)",
              color: "var(--accent-crimson)",
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            URGENT · {match.days_until_expiry}D EXPIRY
          </span>
        )}
      </div>

      {/* Patient demographics info: Space Grotesk and life-rose */}
      <div className="flex items-center gap-3 mb-5 mt-2">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-lg"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid rgba(230, 57, 70, 0.3)",
          }}
        >
          <span>🩸</span>
        </div>
        <div className="space-y-0.5">
          <span
            className="text-[8px] font-bold uppercase tracking-widest block"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
          >
            ⚡ OPTIMAL MATCH FOUND
          </span>
          <h3
            className="font-bold text-lg leading-none uppercase"
            style={{ fontFamily: "var(--font-space-grotesk)", color: "var(--accent-crimson)", textShadow: "0 0 12px rgba(230,57,70,0.3)" }}
          >
            {match.patient_name}
          </h3>
          <p
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
          >
            {match.blood_group} · KELL-NEGATIVE · ALLOIMMUNIZED
          </p>
        </div>
      </div>

      {/* Grid details block: monospace values */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div
          className="p-3.5 rounded-md space-y-1"
          style={{ background: "var(--bg-void)", border: "1px solid var(--bg-border)" }}
        >
          <span
            className="text-[8px] font-bold uppercase tracking-widest block leading-none"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
          >
            Origin Bank Node
          </span>
          <p
            className="font-bold text-xs leading-tight uppercase"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-primary)" }}
          >
            {match.bank_name}
          </p>
          <div
            className="flex items-center gap-1.5 mt-1 text-[8px] font-bold uppercase"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
          >
            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-dim)" }} />
            {match.distance_km} km away
          </div>
        </div>

        <div
          className="p-3.5 rounded-md space-y-1"
          style={{ background: "var(--bg-void)", border: "1px solid var(--bg-border)" }}
        >
          <span
            className="text-[8px] font-bold uppercase tracking-widest block leading-none"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
          >
            Matching Reserves
          </span>
          <p className="font-bold text-xl leading-none" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}>
            {match.units_available} <span className="text-[10px] font-normal" style={{ color: "var(--text-secondary)" }}>Units</span>
          </p>
          <div className="space-y-1 mt-1.5">
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ background: "var(--bg-elevated)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(10, 100 - (match.days_until_expiry * 10))}%`,
                  background: "var(--accent-amber)",
                  boxShadow: "0 0 8px rgba(244, 162, 97, 0.6)",
                }}
              />
            </div>
            <p className="text-[7px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}>
              EXPIRY: {expiryString.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Recommended intelligence alert box */}
      <div
        className="p-3.5 rounded-md mb-5 flex gap-2 text-[9px]"
        style={{
          background: "rgba(0, 180, 216, 0.04)",
          border: "1px solid rgba(0, 180, 216, 0.2)",
        }}
      >
        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-cyan)" }} />
        <p
          className="font-bold leading-relaxed uppercase tracking-wider"
          style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--accent-cyan)" }}
        >
          {match.recommended_action}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {isApproved ? (
          <div
            className="w-full py-3.5 rounded-md flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(82, 183, 136, 0.08)",
              border: "1px solid rgba(82, 183, 136, 0.3)",
              color: "var(--accent-emerald)",
              fontFamily: "var(--font-jetbrains-mono)",
              boxShadow: "0 0 20px rgba(82, 183, 136, 0.15)",
            }}
          >
            <Check className="w-4 h-4" />
            ✓ TRANSFER APPROVED — LOGISTICS INITIATED
          </div>
        ) : (
          <>
            <button
              onClick={handleTriggerApprove}
              disabled={isPending}
              aria-label="Approve target inventory transfer"
              className="flex-1 rounded-md h-12 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                background: isPending ? "rgba(230, 57, 70, 0.15)" : "var(--accent-crimson)",
                color: isPending ? "var(--accent-crimson)" : "white",
                border: `1px solid ${isPending ? "rgba(230,57,70,0.5)" : "var(--accent-crimson)"}`,
                boxShadow: isPending ? "none" : "0 0 20px rgba(230, 57, 70, 0.4)",
                fontFamily: "var(--font-jetbrains-mono)",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isPending) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 35px rgba(230, 57, 70, 0.6)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isPending) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(230, 57, 70, 0.4)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSING TRANSFER...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  APPROVE TRANSFER →
                </>
              )}
            </button>
            <button
              aria-label="Decline match recommendation"
              className="h-12 w-12 rounded-md flex items-center justify-center transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-crimson)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
