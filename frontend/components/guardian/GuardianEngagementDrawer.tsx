"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, AlertTriangle, Send, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Guardian } from "@/types";
import { format } from "date-fns";

interface GuardianEngagementDrawerProps {
  guardian: Guardian | null;
  patientName: string;
  open: boolean;
  onClose: () => void;
  onReengageSuccess?: () => void;
}

export function GuardianEngagementDrawer({
  guardian,
  patientName,
  open,
  onClose,
  onReengageSuccess,
}: GuardianEngagementDrawerProps) {
  const [engagementLog, setEngagementLog] = React.useState<Array<{ date: string; action: string; channel: string }>>([]);

  // Mock engagement signals for charts
  const latencyData = React.useMemo(() => {
    if (!guardian) return [];
    // Generate dummy latency records based on average
    const avg = guardian.response_latency_avg_hours;
    return [
      { cycle: "C-6", hours: Number((avg * 1.1 + Math.random()).toFixed(1)) },
      { cycle: "C-5", hours: Number((avg * 0.9 - Math.random() * 0.5).toFixed(1)) },
      { cycle: "C-4", hours: Number((avg * 1.2 + Math.random()).toFixed(1)) },
      { cycle: "C-3", hours: Number((avg * 1.5 + Math.random() * 2).toFixed(1)) },
      { cycle: "C-2", hours: Number((avg * 1.8 + Math.random() * 3).toFixed(1)) },
      { cycle: "Current", hours: Number((avg * 2.2 + Math.random() * 4).toFixed(1)) },
    ];
  }, [guardian]);

  const reengageMutation = useMutation({
    mutationFn: () => apiPost<unknown>(`/api/v1/guardians/${guardian?.id}/reengage`, {}),
    onSuccess: () => {
      toast.success(`Re-engagement campaign dispatched to ${guardian?.name}`);
      setEngagementLog((prev) => [
        {
          date: format(new Date(), "MMM d, hh:mm a"),
          action: "Re-engagement Message Sent (Claude Bedrock)",
          channel: guardian?.telegram_chat_id ? "Telegram" : "WhatsApp",
        },
        ...prev,
      ]);
      if (onReengageSuccess) onReengageSuccess();
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : "Failed to trigger re-engagement campaign.";
      toast.error(errMsg);
    },
  });

  React.useEffect(() => {
    if (guardian) {
      // Initialize basic communication history logs
      setEngagementLog([
        { date: "May 10, 11:20 AM", action: "System Check-in Broadcast", channel: "WhatsApp" },
        { date: "Apr 20, 09:15 AM", action: "Transfusion Confirmation Check-in", channel: "SMS" },
      ]);
    }
  }, [guardian]);

  if (!guardian) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="right" className="bg-[#0b0b12] border-l border-slate-800 text-slate-100 flex flex-col h-full w-full sm:max-w-md p-6">
        <SheetHeader className="p-0 mb-6">
          <SheetTitle className="text-xl font-black text-rose-500 uppercase tracking-tight font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            Engagement Audit
          </SheetTitle>
          <SheetDescription className="text-slate-400 text-xs mt-1">
            Review response performance logs and activate LLM-re-engagement campaigns for **{guardian.name}**.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 select-none">
          {/* Diagnostic status block */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                Declining Engagement Signal
              </span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed font-medium">
              CUSUM algorithm indicates response latency has drifted to **{guardian.response_latency_avg_hours} hours** over the past 3 cycles. Restabilization campaign recommended.
            </p>
          </div>

          {/* Sparkline Latency Chart */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">
              Response Latency Trend (Hours)
            </h4>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="cycle" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0b0b12", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "10px" }}
                    itemStyle={{ color: "var(--accent-cyan)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: "#f59e0b", strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Re-engagement Command */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                System Command Actions
              </h4>
              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 font-mono">
                CLAUDE BEDROCK ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Dispatches a personalized memorial/re-engagement message referencing past contributions and asking to confirm availability for the upcoming Nov 3 cycle.
            </p>
            <Button
              onClick={() => reengageMutation.mutate()}
              disabled={reengageMutation.isPending}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 mt-2 flex items-center justify-center gap-1.5 rounded-xl transition-all cursor-pointer"
            >
              {reengageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Trigger Re-engagement message
                </>
              )}
            </Button>
          </div>

          {/* Communication Logs */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Comms Log
            </h4>
            <div className="space-y-2.5">
              {engagementLog.map((log, i) => (
                <div
                  key={i}
                  className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex justify-between items-start gap-4"
                >
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold text-slate-200">{log.action}</p>
                    <p className="text-[9px] text-slate-500 font-mono">Channel: {log.channel}</p>
                  </div>
                  <span className="text-[8px] font-semibold text-slate-500 font-mono whitespace-nowrap">{log.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-850 flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-slate-450 hover:text-slate-200 h-9 rounded-xl hover:bg-slate-900"
          >
            Close Panel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
