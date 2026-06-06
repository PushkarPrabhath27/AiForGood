import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SaathiChatbot } from "@/components/shared/SaathiChatbot";
import { AuthGuard } from "@/components/shared/AuthGuard";

export const metadata: Metadata = {
  title: "RaktaSetu NOOR — Clinical AI Platform",
  description: "AI-powered Hemoglobin decay forecasting and blood management for Thalassemia patients in India",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div
        className="flex h-screen w-screen overflow-hidden"
        style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
      >
      {/* Collapsible Sidebar on Desktop */}
      <Sidebar />

      {/* Main Content Space */}
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        {/* Top Navbar */}
        <TopNav />

        {/* Scrollable Layout Content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-24 md:pb-8"
          style={{ background: "var(--bg-void)" }}
        >
          <div className="max-w-7xl mx-auto w-full">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Tab-Bar Navbar */}
      <MobileNav />

      {/* Floating Saathi Chatbot */}
      <SaathiChatbot />
    </div>
    </AuthGuard>
  );
}
