"use client";

import * as React from "react";
import { HeartPulse, RefreshCw, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught rendering error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-6 w-full min-h-[350px] relative overflow-hidden">
          {/* Drifting neural mesh overlay background */}
          <div className="absolute inset-0 neural-mesh opacity-[0.03] pointer-events-none" />

          <Card className="max-w-md w-full bg-gradient-to-b from-bg-secondary to-bg-tertiary border border-accent-rose/25 shadow-2xl rounded-2xl p-6 flex flex-col items-center relative z-10">
            {/* Heartbeat ECG line in rose glowing circle */}
            <div className="w-16 h-16 rounded-full bg-accent-rose/10 border border-accent-rose/30 flex items-center justify-center text-accent-rose mb-5 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse">
              <HeartPulse className="w-8 h-8" />
            </div>

            <CardContent className="p-0 flex flex-col items-center w-full">
              <h3 className="text-slate-100 font-bold text-base text-center leading-snug">
                We're having trouble loading this component
              </h3>

              <p className="text-slate-400 mt-2 text-xs text-center leading-relaxed">
                An unexpected rendering exception was captured. Our monitoring stack has logged this diagnostic event for system verification.
              </p>

              {/* Technical details in small muted code box */}
              <div className="w-full mt-4 p-3 rounded-xl bg-bg-primary/60 border border-bg-hover text-[10px] font-mono text-slate-500 overflow-auto max-h-24 text-center select-all">
                Exception: {this.state.error?.message || "Unknown rendering exception"}
              </div>

              {/* Action Buttons: Primary reload gradient and secondary go back */}
              <div className="flex items-center justify-center gap-3 w-full mt-6">
                <Button
                  onClick={this.handleReset}
                  aria-label="Reload page and retry"
                  className="flex-1 bg-gradient-to-r from-accent-rose to-accent-pink hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:scale-[1.02] active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 py-2 rounded-xl transition-all border-none cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload
                </Button>
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="flex-1 border border-bg-hover hover:bg-bg-hover text-slate-300 font-semibold flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
