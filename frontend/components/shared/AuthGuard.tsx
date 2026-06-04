"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

export interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Check if session token exists in client storage
    const token = localStorage.getItem("raktasetu_session");
    
    // Bypass auth on specific debug route like "/test-ui"
    if (pathname === "/test-ui") {
      setIsAuthenticated(true);
      return;
    }

    if (!token) {
      setIsAuthenticated(false);
      // Route immediately back to gateway
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router, pathname]);

  // Global hotkeys coordinator routing
  React.useEffect(() => {
    if (isAuthenticated !== true) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keydown hotkeys when coordinator is typing inside inputs/textareas
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true")) {
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
  }, [isAuthenticated, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans select-none text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Syncing security authorization...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans select-none p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 animate-bounce">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-white font-extrabold text-lg tracking-tight">Access Locked</h2>
        <p className="text-slate-500 text-xs mt-1.5 max-w-[240px] leading-relaxed">
          Redirecting to clinical credentials portal...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
