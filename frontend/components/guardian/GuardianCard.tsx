"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/StatusPill";
import { Calendar, Phone, Clock, MessageSquare, AlertCircle, RefreshCw, Save, Send } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";
import { useMobilizeCircle, useUpdateGuardian, useSendGuardianMessage } from "@/lib/hooks/useGuardianCircle";
import { toast } from "sonner";
import type { Guardian, GuardianRole, GuardianStatus } from "@/../shared/contracts/api.types";
import { cn } from "@/lib/utils/cn";

export interface GuardianCardProps {
  guardian: Guardian | null;
  patientName: string;
  patientId: string;
  open: boolean;
  onClose: () => void;
}

const roleLabels: Record<GuardianRole, string> = {
  primary: "PRIMARY GUARDIAN",
  secondary: "SECONDARY BACKUP",
  rare_specialist: "RARE SPECIALIST",
};

const statusLabels: Record<GuardianStatus, string> = {
  active: "READY TO DONATE",
  cooldown: "IN COOLDOWN PERIOD",
  pending: "MOBILIZATION DISPATCHED",
  unavailable: "TEMPORARILY ABSENT",
  empty: "SLOT UNASSIGNED",
};

export function GuardianCard({
  guardian,
  patientName = "Priya",
  patientId,
  open,
  onClose,
}: GuardianCardProps) {
  const [chatId, setChatId] = React.useState("");
  const [customMessage, setCustomMessage] = React.useState("");

  const mobilizeCircleMutation = useMobilizeCircle();
  const updateGuardianMutation = useUpdateGuardian();
  const sendGuardianMessageMutation = useSendGuardianMessage();

  React.useEffect(() => {
    if (guardian) {
      setChatId(guardian.telegram_chat_id || "");
      const template = `Hi ${guardian.name}, this is RaktaSetu Niloufer. ${patientName}'s scheduled blood transfusion is approaching. Are you available to support her by donating?`;
      setCustomMessage(template);
    }
  }, [guardian, patientName]);

  if (!guardian) return null;

  const handleMobilizeClick = () => {
    mobilizeCircleMutation.mutate(patientId, {
      onSuccess: () => {
        toast.success(`WhatsApp mobilization broadcast dispatched for Suresh!`);
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to trigger Twilio broadcast.");
      },
    });
  };

  const handleSaveChatId = async () => {
    try {
      await updateGuardianMutation.mutateAsync({
        patientId: patientId,
        guardianId: guardian.id,
        data: { telegram_chat_id: chatId },
      });
      toast.success("Telegram Chat ID updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update Telegram Chat ID.");
    }
  };

  const handleSendMessageClick = () => {
    sendGuardianMessageMutation.mutate(
      {
        patientId: patientId,
        guardianId: guardian.id,
        message: customMessage,
      },
      {
        onSuccess: (res: any) => {
          toast.success(`Telegram message dispatched to ${guardian.name}!`);
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to dispatch Telegram message.");
        },
      }
    );
  };

  const formattedLanguage = guardian.preferred_language === "te" ? "Telugu" :
                            guardian.preferred_language === "hi" ? "Hindi" :
                            guardian.preferred_language === "mr" ? "Marathi" : "English";

  const isSureshPending = guardian.name.includes("Suresh") && guardian.status === "pending";

  const roleColorClass = guardian.role === "primary" ? "border-pulse-magenta text-pulse-magenta shadow-[0_0_8px_rgba(255,0,110,0.1)]" :
                         guardian.role === "secondary" ? "border-pulse-cyan text-pulse-cyan shadow-[0_0_8px_rgba(0,240,255,0.1)]" :
                         "border-life-gold text-life-gold shadow-[0_0_8px_rgba(255,209,98,0.1)]";

  const statusColorClass = guardian.status === "active" ? "text-pulse-emerald border-pulse-emerald/35" :
                           guardian.status === "cooldown" ? "text-pulse-amber border-pulse-amber/35 animate-pulse" :
                           guardian.status === "pending" ? "text-pulse-cyan border-pulse-cyan/35" : "text-pulse-magenta border-pulse-magenta/35";

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="bg-aether-midnight border-l border-pulse-cyan/15 text-slate-100 w-full sm:max-w-md rounded-l-xl p-6 select-none flex flex-col justify-between overflow-y-auto font-mono">
        <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
        
        <div className="space-y-6 relative z-10">
          <SheetHeader className="text-left font-mono">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                GUARDIAN TELEMETRY PROFILE
              </span>
              <Badge className={cn("bg-aether-void border rounded uppercase text-[8px] font-bold tracking-widest", roleColorClass)}>
                {roleLabels[guardian.role]}
              </Badge>
            </div>
            {/* Space Grotesk patient name */}
            <SheetTitle className="text-white font-bold text-2xl font-space uppercase leading-none">
              {guardian.name}
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">
              Supports Thalassemia care circle for {patientName}.
            </SheetDescription>
          </SheetHeader>

          {/* Current Status Pill: Hollowed-out thin borders */}
          <div className="flex items-center gap-3 bg-aether-void/60 p-3 rounded-md border border-aether-ink">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status:</span>
            <Badge className={cn("bg-aether-void border rounded uppercase text-[8px] font-bold tracking-widest py-0.5 px-2", statusColorClass)}>
              {statusLabels[guardian.status]}
            </Badge>
          </div>

          {/* Metric Details Grid: Large JetBrains Mono metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-aether-void/60 p-4 rounded-md border border-aether-ink space-y-1">
              <span className="text-[8px] font-bold uppercase text-slate-500 block tracking-widest leading-none">
                Last Donation
              </span>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 leading-none">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {guardian.last_donation_date ? formatDate(guardian.last_donation_date, "MMM dd, yyyy").toUpperCase() : "NEVER"}
              </span>
            </div>

            <div className="bg-aether-void/60 p-4 rounded-md border border-aether-ink space-y-1">
              <span className="text-[8px] font-bold uppercase text-slate-500 block tracking-widest leading-none">
                Eligibility Date
              </span>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 leading-none">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {guardian.next_eligible_date ? formatDate(guardian.next_eligible_date, "MMM dd, yyyy").toUpperCase() : "ELIGIBLE NOW"}
              </span>
            </div>

            <div className="bg-aether-void/60 p-4 rounded-md border border-aether-ink space-y-1">
              <span className="text-[8px] font-bold uppercase text-slate-500 block tracking-widest leading-none">
                Donations Count
              </span>
              <span className="text-base font-bold text-pulse-cyan leading-none">
                {guardian.donation_count} UNITS
              </span>
            </div>

            <div className="bg-aether-void/60 p-4 rounded-md border border-aether-ink space-y-1">
              <span className="text-[8px] font-bold uppercase text-slate-500 block tracking-widest leading-none">
                Response Time
              </span>
              <span className="text-xs font-bold text-pulse-amber flex items-center gap-1.5 leading-none">
                <Clock className="w-3.5 h-3.5 text-pulse-amber/70" />
                {guardian.response_latency_avg_hours} HRS
              </span>
            </div>
          </div>

          {/* Demographic / language details */}
          <div className="space-y-3 pt-2 font-mono">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">
              Communication Details
            </h4>
            <div className="space-y-2 text-[10px] text-slate-350">
              <div className="flex justify-between py-1 border-b border-aether-ink">
                <span className="text-slate-500 uppercase tracking-wider">Contact Number:</span>
                <span className="text-slate-350 font-bold flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  +91 ******{guardian.phone_last4}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-aether-ink gap-4">
                <span className="text-slate-500 uppercase tracking-wider flex-shrink-0">Telegram Chat ID:</span>
                <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                  <input
                    type="text"
                    placeholder="Not linked"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="h-7 w-full bg-aether-midnight border border-aether-ink/80 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-pulse-cyan/50 font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveChatId}
                    disabled={updateGuardianMutation.isPending || chatId === (guardian.telegram_chat_id || "")}
                    className="h-7 px-2.5 bg-aether-slate hover:bg-aether-slate/85 border border-pulse-cyan/20 text-pulse-cyan text-[8px] tracking-widest uppercase font-mono flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateGuardianMutation.isPending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-aether-ink">
                <span className="text-slate-500 uppercase tracking-wider">Preferred Language:</span>
                <span className="font-bold text-slate-350 uppercase">{formattedLanguage}</span>
              </div>
            </div>
          </div>

          {/* Custom Telegram Messaging Section */}
          {guardian.status !== "empty" && (
            <div className="space-y-3 pt-2 font-mono border-t border-aether-ink">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">
                Contact via Telegram Bot
              </h4>
              <div className="space-y-2 bg-aether-void/60 p-3 rounded-md border border-aether-ink">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold uppercase text-slate-500 tracking-widest leading-none">
                    Preview / Edit Message
                  </span>
                  <span className="text-[7px] text-pulse-cyan font-bold uppercase tracking-widest px-1 py-0.5 rounded bg-pulse-cyan/5 border border-pulse-cyan/10">
                    Live Telegram Bot
                  </span>
                </div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full text-[10px] bg-aether-midnight border border-aether-ink/80 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-pulse-cyan/50 font-mono resize-none leading-normal"
                />
                
                {guardian.telegram_chat_id ? (
                  <span className="text-[7px] text-pulse-emerald block uppercase font-bold tracking-wider">
                    ✓ Connected: Chat ID {guardian.telegram_chat_id}
                  </span>
                ) : (
                  <span className="text-[7px] text-pulse-amber block uppercase font-bold tracking-wider animate-pulse">
                    ⚠️ Telegram Chat ID not linked! Defaulting to Coordinator Inbox.
                  </span>
                )}

                <button
                  onClick={handleSendMessageClick}
                  disabled={sendGuardianMessageMutation.isPending}
                  className="w-full bg-gradient-to-r from-pulse-cyan via-pulse-cyan/80 to-pulse-cyan/60 hover:brightness-110 text-aether-void font-bold h-9 rounded flex items-center justify-center gap-1.5 cursor-pointer uppercase text-[9px] tracking-widest font-mono border border-white/10"
                >
                  {sendGuardianMessageMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send Telegram Notification
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Footers: Rethemed direct confirm button in custom gradients */}
        <div className="space-y-3 pt-6 border-t border-aether-ink relative z-10 font-sans">
          {isSureshPending ? (
            <div className="p-4 rounded-md bg-pulse-cyan/5 border border-pulse-cyan/15 text-xs text-pulse-cyan space-y-3 animate-in fade-in duration-300 font-mono">
              <div className="flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-pulse-cyan animate-pulse" />
                <div className="space-y-1 uppercase tracking-wider text-[9px]">
                  <span className="font-bold text-white block">Suresh Standby Mobilization</span>
                  <span>Twilio broadcast dispatched 4 days ago. Suresh responded this morning. Confirm Suresh sets active.</span>
                </div>
              </div>
              <button
                onClick={handleMobilizeClick}
                disabled={mobilizeCircleMutation.isPending}
                className="w-full bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber hover:brightness-110 text-aether-void font-bold h-10 rounded-md flex items-center justify-center gap-1.5 cursor-pointer uppercase text-[10px] tracking-widest font-space border border-white/10"
              >
                {mobilizeCircleMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                Confirm Suresh Active (Direct Mobilize)
              </button>
            </div>
          ) : (
            <a
              href={`https://wa.me/91999999${guardian.phone_last4}?text=Hi%20${guardian.name},%20this%20is%2520RaktaSetu%2520Niloufer.%20Priya's%20transfusion%20is%20forecasted%20for%20Nov%203.%20Are%2520you%2520available?`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-aether-slate hover:bg-aether-slate/85 border border-pulse-cyan/20 text-pulse-cyan font-bold h-10 rounded-md flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase transition-colors font-mono cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-pulse-emerald" />
              Send WhatsApp Message
            </a>
          )}

          <Button
            disabled
            className="w-full bg-transparent hover:bg-transparent text-slate-650 border border-aether-ink/50 font-bold h-10 rounded-md cursor-not-allowed uppercase text-[9px] tracking-widest font-mono"
          >
            Substitute Donor (Admin Only)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
