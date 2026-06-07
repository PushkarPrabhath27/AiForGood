"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import { Loader2 } from "lucide-react";

export interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.getAttribute("contenteditable") === "true")
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "g") {
        e.preventDefault();
        router.push("/dashboard/patient/550e8400-e29b-41d4-a716-446655440001/guardian");
      } else if (key === "m") {
        e.preventDefault();
        router.push("/dashboard/grid");
      } else if (key === "h") {
        e.preventDefault();
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  React.useEffect(() => {
    const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    
    // Bypass authentication checks if Cognito pool is set to placeholders
    if (!poolId || poolId.includes("mock") || poolId.includes("XXXX")) {
      setIsAuthenticated(true);
      return;
    }

    async function checkAuth() {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
        if (!pathname.startsWith("/auth")) {
          router.push("/auth");
        }
      }
    }
    checkAuth();
  }, [pathname, router]);

  if (isAuthenticated === null) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4"
        style={{ background: "var(--bg-void)" }}
      >
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(230, 57, 70, 0.3)", borderTopColor: "var(--accent-crimson)" }}
          />
        </div>
        <p
          className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono"
        >
          Securing session...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
