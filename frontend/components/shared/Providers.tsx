"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAmplify } from "@/lib/auth-config";

configureAmplify();

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [mocksReady, setMocksReady] = React.useState(false);

  React.useEffect(() => {
    // Dynamically initialize mock worker if conditions match
    const loadMocks = async () => {
      try {
        const { initMocks } = await import("@/lib/mocks/browser");
        await initMocks();
      } catch (err) {
        console.error("Failed to initialize MSW conditional mock worker:", err);
      } finally {
        setMocksReady(true);
      }
    };
    loadMocks();
  }, []);

  if (!mocksReady) {
    // Loading screen during mock initialization
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4"
        style={{ background: "var(--bg-void)" }}
      >
        {/* Animated crimson ring */}
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(230, 57, 70, 0.3)", borderTopColor: "var(--accent-crimson)" }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "rgba(0, 180, 216, 0.2)",
              borderTopColor: "var(--accent-cyan)",
              animationDirection: "reverse",
              animationDuration: "0.8s",
            }}
          />
        </div>
        <div className="text-center">
          <p
            className="text-sm font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-secondary)" }}
          >
            Initializing RaktaSetu NOOR...
          </p>
          <p
            className="text-[9px] mt-1 font-bold uppercase tracking-widest"
            style={{ fontFamily: "var(--font-jetbrains-mono)", color: "var(--text-dim)" }}
          >
            PROPHET ENGINE v2.1 · HYD CLUSTER
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
