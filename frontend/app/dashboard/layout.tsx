import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SaathiChatbot } from "@/components/shared/SaathiChatbot";

export const metadata: Metadata = {
  title: "Dashboard | RaktaSetu NOOR",
  description: "Clinical AI platform for Thalassemia blood management",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
        {/* Collapsible Sidebar on Desktop */}
        <Sidebar />

        {/* Main Content Space */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Top Navbar */}
          <TopNav />
          
          {/* Scrollable Layout Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-950 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto w-full h-full">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Mobile Tab-Bar Navbar */}
        <MobileNav />

        {/* Floating Saathi Chatbot Assistant */}
        <SaathiChatbot />
      </div>
    </AuthGuard>
  );
}
