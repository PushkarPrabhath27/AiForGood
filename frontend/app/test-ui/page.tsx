"use client";

import { useState } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { formatHb, formatConfidence } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/dates";
import { isCompatible } from "@/lib/utils/blood-types";

export default function TestUiPage() {
  const [inputValue, setInputValue] = useState("");
  const [testDonor, setTestDonor] = useState("O-");
  const [testRecipient, setTestRecipient] = useState("B+");

  const handleShowToast = () => {
    toast.success("RaktaSetu NOOR Phase 1 Primitives Active!");
  };

  const compatibilityResult = isCompatible(testDonor, testRecipient)
    ? "COMPATIBLE MATCH (Safe Transfusion)"
    : "INCOMPATIBLE MATCH (High Risk)";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header Component under verification */}
        <PageHeader
          title="RaktaSetu NOOR UI Components Testbed"
          subtitle="Phase 1: Shared primitives, utilities, and page shell layouts verification dashboard."
          action={{
            label: "Trigger System Toast",
            onClick: handleShowToast,
          }}
        />

        <Toaster />

        {/* 1. StatusPill Primitives */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">1. StatusPill Primitives (No Color-Only Indicators)</h2>
          <div className="flex flex-wrap gap-3">
            <StatusPill status="green" label="Active Coverage (7/8 Confirmed)" />
            <StatusPill status="amber" label="Cooldown Period (40d remaining)" />
            <StatusPill status="red" label="Critical Shortage (O- Stock Low)" />
            <StatusPill status="blue" label="Mobilizing (SMS sent)" />
            <StatusPill status="gray" label="Standby / Unallocated" />
          </div>
          <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800 text-xs text-slate-400">
            <strong>Accessibility Check:</strong> Interactive click handlers have full keyboard focus (`tabIndex={0}`) and custom screen-reader announcements (`aria-label`).
          </div>
        </section>

        {/* 2. AlertBanner Component */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">2. Dismissible Alert Banners</h2>
          <div className="space-y-3">
            <AlertBanner
              variant="info"
              title="System Synchronized"
              message="RaktaGrid completed real-time sync with 5 Hyderabad blood bank inventories 12 minutes ago."
              actionLabel="Verify Inventory"
              onAction={() => toast.info("RaktaGrid inventory check initiated")}
            />
            <AlertBanner
              variant="warning"
              title="Iron Overload Trending Alert"
              message="Priya's serum ferritin has exceeded 2,500 ng/mL. Claude coordinator has pre-drafted doctor notification details."
              actionLabel="Review Draft"
              onAction={() => toast.warning("Claude report review opened")}
            />
            <AlertBanner
              variant="error"
              title="Alloimmunization Detected"
              message="Patient Vikram is exhibiting antigen-specific alloimmunization anomalies. Extended phenotype filters applied."
              actionLabel="Restrict Grid Search"
              onAction={() => toast.error("Filters set: Kell, Duffy, Kidd restricted")}
            />
          </div>
        </section>

        {/* 3. Loading Skeletons */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">3. Loading Skeletons</h2>
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 text-slate-400">
              <TabsTrigger value="chart" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100">
                Chart Skeleton
              </TabsTrigger>
              <TabsTrigger value="card" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100">
                Card Skeleton
              </TabsTrigger>
              <TabsTrigger value="table" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100">
                Table Skeleton
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="mt-4">
              <LoadingSkeleton variant="chart" />
            </TabsContent>
            <TabsContent value="card" className="mt-4">
              <LoadingSkeleton variant="card" />
            </TabsContent>
            <TabsContent value="table" className="mt-4">
              <LoadingSkeleton variant="table" lines={3} />
            </TabsContent>
          </Tabs>
        </section>

        {/* 4. Utilities Verification (Dates, Format, Compatibility) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">4. Clinical & Format Utilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 p-6 rounded-3xl border border-slate-800">
            
            {/* Clinical Formatters & Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Formatters & Date Math</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">Hemoglobin (formatHb):</span>{" "}
                  <code className="text-rose-400 font-semibold">{formatHb(7.225)}</code>
                </div>
                <div>
                  <span className="text-slate-500">Confidence Score (formatConfidence):</span>{" "}
                  <code className="text-violet-400 font-semibold">{formatConfidence(0.89)}</code>
                </div>
                <div>
                  <span className="text-slate-500">Clinical Date Formatting (formatDate):</span>{" "}
                  <code className="text-sky-400 font-semibold">{formatDate("2024-11-03T00:00:00Z", "PPPP")}</code>
                </div>
              </div>
            </div>

            {/* Donor Compatibility */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Blood Phenotype Compatibility</h3>
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="w-1/2">
                    <Label className="text-xs text-slate-500">Donor</Label>
                    <Select value={testDonor} onValueChange={(val) => setTestDonor(val ?? "O-")}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-8">
                        <SelectValue placeholder="Donor" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-800 text-slate-100 text-xs">
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/2">
                    <Label className="text-xs text-slate-500">Recipient</Label>
                    <Select value={testRecipient} onValueChange={(val) => setTestRecipient(val ?? "B+")}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-8">
                        <SelectValue placeholder="Recipient" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-slate-800 text-slate-100 text-xs">
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs pt-1">
                  Result:{" "}
                  <span className={isCompatible(testDonor, testRecipient) ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {compatibilityResult}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 5. EmptyState Primitives */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">5. EmptyState Layout Placeholder</h2>
          <EmptyState
            title="No Patient Selected"
            description="Select a Thalassemia patient profile from the dashboard list or top navigation search to initiate the clinical forecasting engine."
            action={{
              label: "Explore Demo Profile (Priya)",
              onClick: () => toast.info("Demo user Priya selected for loading..."),
            }}
          />
        </section>

        {/* 6. Modals / Dialog & Sheet triggers */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-slate-200">6. Dialogs & Side Panels</h2>
          <div className="flex gap-4">
            <Dialog>
              <DialogTrigger className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-slate-100 text-sm font-medium">
                Verify Dialog
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Log Hemoglobin Reading</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Register a new Hb reading event to refresh predictions.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-slate-300 text-sm">
                  Clinical input fields compile correctly.
                </div>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-slate-100 text-sm font-medium">
                Verify Sheet panel
              </SheetTrigger>
              <SheetContent className="bg-slate-900 border-slate-800 text-slate-100">
                <SheetHeader>
                  <SheetTitle className="text-slate-100">Guardian Constellation details</SheetTitle>
                  <SheetDescription className="text-slate-400">
                    Showing real-time communication ledger details.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 text-slate-300 text-sm">
                  Communication channel logging verification active.
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </section>

      </div>
    </div>
  );
}
