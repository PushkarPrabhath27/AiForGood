"use client";

import * as React from "react";
import { Users, AlertTriangle, ShieldCheck, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/dates";
import { toast } from "sonner";
import type { AlertFlag, AlertType } from "@/../shared/contracts/api.types";
import { cn } from "@/lib/utils/cn";

export interface ClinicalAlertsProps {
  alerts: AlertFlag[];
}

interface AlertPillConfig {
  type: AlertType;
  title: string;
  defaultIcon: React.ReactNode;
}

const pillConfigs: AlertPillConfig[] = [
  {
    type: "circle_degraded",
    title: "Guardian Network",
    defaultIcon: <Users className="w-5 h-5" />,
  },
  {
    type: "iron_overload",
    title: "Iron Overload Status",
    defaultIcon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    type: "alloimmunization",
    title: "Alloimmunization Risk",
    defaultIcon: <ShieldCheck className="w-5 h-5" />,
  },
];

export function ClinicalAlerts({ alerts }: ClinicalAlertsProps) {
  const [selectedType, setSelectedType] = React.useState<AlertType | null>(null);

  // Return status metrics based on presence of active warnings
  const getAlertStatusInfo = (type: AlertType): { borderClass: string; textClass: string; iconClass: string; label: string; hasWarning: boolean } => {
    const alert = alerts.find((a) => a.type === type);
    
    if (type === "circle_degraded") {
      return { 
        borderClass: "border-l-4 border-l-accent-emerald", 
        textClass: "text-accent-emerald", 
        iconClass: "bg-accent-emerald/20 text-accent-emerald rounded-full",
        label: alert ? alert.message : "Active network secured. 7 of 8 guardians active.",
        hasWarning: !!alert
      };
    }
    if (type === "iron_overload") {
      return { 
        borderClass: "border-l-4 border-l-accent-orange shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]", 
        textClass: "text-accent-orange", 
        iconClass: "bg-accent-orange/20 text-accent-orange rounded-full",
        label: alert ? alert.message : "Ferritin level is 2,530 ng/mL. Stable diagnostic baseline.",
        hasWarning: !!alert
      };
    }
    // Alloimmunization
    return { 
      borderClass: "border-l-4 border-l-accent-violet", 
      textClass: "text-accent-violet", 
      iconClass: "bg-accent-violet/20 text-accent-violet rounded-full",
      label: alert ? alert.message : "No alloimmunization anomalies detected in the current cycle.",
      hasWarning: !!alert
    };
  };

  const handlePillClick = (type: AlertType) => {
    if (selectedType === type) {
      setSelectedType(null); // toggle collapse
    } else {
      setSelectedType(type);
    }
  };

  const activeAlert = React.useMemo(() => {
    if (!selectedType) return null;
    return alerts.find((a) => a.type === selectedType);
  }, [alerts, selectedType]);

  return (
    <div className="space-y-4 select-none">
      
      {/* Pills Container: Glass Cards in horizontal row with dynamic left borders */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {pillConfigs.map((pill) => {
          const { borderClass, textClass, iconClass, label, hasWarning } = getAlertStatusInfo(pill.type);
          const isSelected = selectedType === pill.type;

          return (
            <Card
              key={pill.type}
              onClick={() => handlePillClick(pill.type)}
              className={cn(
                "flex-1 bg-gradient-to-b from-bg-secondary to-bg-tertiary aether-glass cursor-pointer rounded-xl transition-all duration-300 min-h-[108px] flex items-center justify-between hover:-translate-y-1 hover:bg-bg-hover hover:border-accent-blue/30 hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.2)] relative border border-bg-hover",
                borderClass,
                isSelected ? "ring-1 ring-accent-cyan/30" : ""
              )}
            >
              <CardContent className="p-4 flex items-center justify-between gap-3 w-full h-full relative z-10">
                <div className="flex items-start gap-3.5 min-w-0 w-full">
                  <div className={cn("w-9 h-9 flex items-center justify-center flex-shrink-0 shadow-md", iconClass)}>
                    {pill.defaultIcon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block leading-none mb-2 font-mono">
                      {pill.title}
                    </span>
                    <span className={cn("text-sm font-medium block whitespace-normal break-words leading-tight tracking-wide", textClass)}>
                      {label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Expandable Detail Panel themed in AETHER Glass */}
      {selectedType && (
        <Card className="aether-glass border border-accent-cyan/15 rounded-xl p-5 animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
          <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
          
          <CardContent className="p-0 relative z-10">
            {activeAlert ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-3 pb-3 border-b border-bg-hover">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                      Clinical Intelligence Flag Status
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-wide leading-snug">
                      {activeAlert.message}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                    Detected: {formatDate(activeAlert.detected_at, "Pp").toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                    Recommended Action Strategy
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed bg-bg-primary/60 p-4 rounded-md border border-bg-hover tracking-wide">
                    {activeAlert.recommended_action}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.success(`Action successfully executed for alert.`);
                      setSelectedType(null);
                    }}
                    className="bg-bg-tertiary hover:bg-bg-hover text-accent-cyan border border-accent-cyan/20 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-accent-teal" />
                    Mark Resolved
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="pb-3 border-b border-bg-hover">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                    Clinical Intelligence Flag Status
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1 tracking-wide">
                    Baseline stable within healthy physiological constraints.
                  </h3>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                    Recommended Action
                  </span>
                  <p className="text-sm text-slate-400 leading-relaxed bg-bg-primary/60 p-3 rounded-md border border-bg-hover tracking-wide">
                    No active degradation detected. Maintain current eligibility schedules and support structures.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
