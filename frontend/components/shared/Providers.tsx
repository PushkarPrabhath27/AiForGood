"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAmplify } from "@/lib/auth-config";

configureAmplify();

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mswReady, setMswReady] = React.useState(false);

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

  React.useEffect(() => {
    // Dynamically import MSW so it only runs in the browser
    import("@/lib/mocks/browser")
      .then(({ initMocks }) => initMocks())
      .catch((err) => console.warn("[MSW] Failed to start mock worker:", err))
      .finally(() => setMswReady(true));
  }, []);

  if (!mswReady) {
    return null; // Wait for MSW to be ready before rendering (prevents pre-intercept requests)
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
