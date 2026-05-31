"use client";

import * as React from "react";
import { Info, AlertTriangle, AlertOctagon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type AlertVariant = "info" | "warning" | "error";

export interface AlertBannerProps {
  variant: AlertVariant;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const bannerStyles: Record<AlertVariant, string> = {
  info: "bg-sky-950/30 text-sky-300 border-sky-800/20",
  warning: "bg-amber-950/30 text-amber-300 border-amber-800/20",
  error: "bg-rose-950/30 text-rose-300 border-rose-800/20",
};

const icons: Record<AlertVariant, React.ReactNode> = {
  info: <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
  error: <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0" />,
};

export function AlertBanner({
  variant,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300",
        bannerStyles[variant],
        className
      )}
    >
      <div className="flex gap-3 items-start">
        <span className="mt-0.5 sm:mt-0" aria-hidden="true">
          {icons[variant]}
        </span>
        <div className="space-y-1">
          <h3 className="font-bold text-sm leading-tight text-white">{title}</h3>
          {message && <p className="text-xs text-slate-300 leading-relaxed">{message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {actionLabel && onAction && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAction}
            aria-label={actionLabel}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all duration-200",
              variant === "info" && "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20 hover:text-sky-300",
              variant === "warning" && "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300",
              variant === "error" && "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300"
            )}
          >
            {actionLabel}
          </Button>
        )}
        <button
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss alert"
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
