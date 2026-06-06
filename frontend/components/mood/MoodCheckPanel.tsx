"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Brain, Sparkles, Send, CheckCircle2, Clock, Activity, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMoodLogs, useTriggerMoodCheck, useMoodSSE } from "@/lib/hooks/useMood";
import { formatDate } from "@/lib/utils/dates";
import { toast } from "sonner";
import type { MoodLog } from "@/../shared/contracts/api.types";

interface MoodCheckPanelProps {
  patientId: string;
  patientName?: string;
}

const MOOD_EMOJI: Record<number, string> = {
  3: "\uD83D\uDE0A",
  2: "\uD83D\uDE10",
  1: "\uD83D\uDE14",
};

const MOOD_LABEL: Record<number, string> = {
  3: "Good / Energetic",
  2: "Okay / Tired",
  1: "Stressed / Depressed",
};

const MOOD_COLOR: Record<number, string> = {
  3: "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/10",
  2: "text-accent-amber border-accent-amber/30 bg-accent-amber/10",
  1: "text-accent-crimson border-accent-crimson/30 bg-accent-crimson/10",
};

const MOOD_GLOW: Record<number, string> = {
  3: "shadow-emerald-500/20",
  2: "shadow-amber-500/20",
  1: "shadow-rose-500/20",
};

export function MoodCheckPanel({ patientId, patientName }: MoodCheckPanelProps) {
  const [triggerState, setTriggerState] = React.useState<"idle" | "sending" | "sent" | "received">("idle");
  const [animatingMood, setAnimatingMood] = React.useState<MoodLog | null>(null);

  const { data: moodLogsData } = useMoodLogs(patientId);
  const triggerMutation = useTriggerMoodCheck();

  const handleMoodUpdate = React.useCallback((mood: MoodLog) => {
    setAnimatingMood(mood);
    setTriggerState("received");
    const timer = setTimeout(() => setAnimatingMood(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  useMoodSSE(patientId, handleMoodUpdate);

  const handleTriggerCheck = () => {
    setTriggerState("sending");
    triggerMutation.mutate(patientId, {
      onSuccess: (data) => {
        if (data.data?.status === "skipped") {
          toast.warning("Telegram chat ID not configured. Mood check skipped.");
          setTriggerState("idle");
        } else {
          setTriggerState("sent");
          toast.success("Mood check sent via Telegram!");
        }
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to send mood check.");
        setTriggerState("idle");
      },
    });
  };

  const moodLogs = moodLogsData?.data?.logs ?? [];
  const latestMood = moodLogs[0] ?? null;
  const latestScore = latestMood?.mood_score ?? null;

  return (
    <Card className="bg-gradient-to-b from-bg-secondary to-bg-tertiary aether-glass rounded-xl border border-bg-hover overflow-hidden relative">
      <div className="absolute inset-0 neural-mesh opacity-[0.015] pointer-events-none" />

      <CardContent className="p-5 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/15 flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent-cyan" />
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Proactive Mood Check
              </h3>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                Telegram-based remote monitoring
              </p>
            </div>
          </div>
          {latestScore && (
            <Badge
              className={`text-[9px] font-bold uppercase tracking-widest font-mono border ${
                latestScore === 3
                  ? "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30"
                  : latestScore === 2
                  ? "bg-accent-amber/15 text-accent-amber border-accent-amber/30"
                  : "bg-accent-crimson/15 text-accent-crimson border-accent-crimson/30"
              }`}
            >
              <Activity className="w-3 h-3 mr-1" />
              {MOOD_LABEL[latestScore]}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTriggerCheck}
            disabled={triggerState === "sending" || triggerMutation.isPending}
            className={`flex-1 h-10 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all select-none ${
              triggerState === "received"
                ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30"
                : triggerState === "sent"
                ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 animate-pulse"
                : "bg-accent-cyan hover:bg-accent-cyan/90 text-white shadow-lg shadow-accent-cyan/20"
            }`}
          >
            {triggerState === "sending" || triggerMutation.isPending ? (
              <>
                <Send className="w-3.5 h-3.5 animate-pulse" />
                Sending...
              </>
            ) : triggerState === "sent" ? (
              <>
                <MessageCircle className="w-3.5 h-3.5" />
                Waiting for response...
              </>
            ) : triggerState === "received" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Response Received
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Check Mood via Telegram
              </>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {animatingMood && (
            <motion.div
              key={`mood-anim-${animatingMood.id}`}
              initial={{ scale: 0.8, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`p-4 rounded-xl border ${
                MOOD_COLOR[animatingMood.mood_score] || "text-slate-400 border-slate-700 bg-slate-800/30"
              } ${MOOD_GLOW[animatingMood.mood_score] || ""} shadow-lg`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{MOOD_EMOJI[animatingMood.mood_score] || "😐"}</span>
                <div>
                  <p className="text-sm font-bold text-white">
                    {patientName || "Patient"} is feeling{" "}
                    <span className="font-extrabold">
                      {MOOD_LABEL[animatingMood.mood_score] || "Okay"}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(animatingMood.timestamp, "PPp")}
                  </p>
                </div>
              </div>
              {animatingMood.mood_score === 1 && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-accent-crimson font-bold font-mono uppercase tracking-widest">
                  <AlertTriangle className="w-3 h-3" />
                  Adherence risk elevated — care team notified
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {moodLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Mood History
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {moodLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-bg-primary/40 border border-bg-hover/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{MOOD_EMOJI[log.mood_score] || "😐"}</span>
                    <span className="text-xs font-medium text-slate-300">
                      {MOOD_LABEL[log.mood_score] || "Unknown"}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">
                    {formatDate(log.timestamp, "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {moodLogs.length === 0 && triggerState === "idle" && (
          <div className="text-center py-3">
            <p className="text-[10px] text-slate-600 font-mono">
              No mood data yet. Trigger a check to start monitoring.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
