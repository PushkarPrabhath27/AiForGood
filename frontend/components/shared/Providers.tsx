"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    // Dynamic import to avoid bundling msw browser chunks on server builds
    async function startMocks() {
      if (
        process.env.NODE_ENV === "development" &&
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").includes("localhost")
      ) {
        try {
          const { initMocks } = await import("@/lib/mocks/browser");
          // Prevent MSW registration from hanging the UI indefinitely
          await Promise.race([
            initMocks(),
            new Promise((resolve) => setTimeout(resolve, 800)),
          ]);
        } catch (error) {
          console.error("[MSW] Mock initialization error:", error);
        }
      }
      setMocksReady(true);
    }
    startMocks();
  }, []);

  if (!mocksReady) {
    // Render standard loading skeleton during mock initializing in dev mode
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-xs font-medium tracking-wide">Initializing RaktaSetu Care Core...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
