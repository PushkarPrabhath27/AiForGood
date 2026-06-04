"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export interface AuthGuardProps {
  children: React.ReactNode;
}

// Auth removed — direct access, no login gate.
// Keeping keyboard shortcut hotkeys for demo navigation.
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

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

  return <>{children}</>;
}
