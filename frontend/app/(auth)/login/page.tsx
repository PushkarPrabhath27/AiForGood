"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ShieldCheck, Mail, Lock, LogIn, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CoordinatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Demo bypass sign-in handler
  const handleDemoSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate network verification lag
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Seed mock session token coordinate parameters
      localStorage.setItem("raktasetu_session", "demo_session_jwt_coordinator_kulkarni");
      toast.success("Successfully logged in as Clinical Coordinator S. Kulkarni.");
      
      // Redirect to master dashboard
      router.push("/dashboard");
    } catch {
      toast.error("Auth bypass handshake failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Real Supabase standard sign-in callback (demo fallback)
  const handleRealSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning("Please fill in both the clinical email and passcode.");
      return;
    }
    toast.info("Database synced in offline local demo mode. Utilizing bypass is recommended.");
  };

  return (
    <div className="min-h-screen bg-aether-void flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* 1. Full-screen Animated Neural Mesh Grid Background */}
      <div className="absolute inset-0 neural-mesh opacity-[0.06] pointer-events-none" />

      {/* Visual Ambient Background glows using AETHER colors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-pulse-cyan/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pulse-magenta/5 blur-[140px] pointer-events-none" />

      {/* 2. Floating Glass Card Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10 relative"
      >
        <Card className="aether-glass border border-pulse-cyan/15 rounded-xl overflow-hidden shadow-2xl relative">
          {/* Subtle edge neon light strip */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber opacity-60" />
          
          <CardHeader className="p-8 pb-4 flex flex-col items-center text-center space-y-2">
            {/* Clinical Brand Logo */}
            <div className="w-14 h-14 rounded-xl bg-aether-slate border border-pulse-cyan/20 flex items-center justify-center text-xl shadow-lg shadow-black/40 mb-2 relative overflow-hidden group">
              <span className="relative z-10 filter drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">🩸</span>
              <div className="absolute inset-0 bg-pulse-cyan/5 group-hover:bg-pulse-cyan/10 transition-colors" />
            </div>
            
            {/* Space Grotesk gradient title */}
            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-life-rose bg-clip-text text-transparent font-space">
              RaktaSetu NOOR
            </CardTitle>
            
            {/* JetBrains Mono Uppercase wide tracking subtitle */}
            <CardDescription className="text-[10px] text-pulse-cyan font-semibold uppercase tracking-widest font-mono">
              PREDICTIVE HEMATOLOGY INTELLIGENCE
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-2">
            <form onSubmit={handleRealSignIn} className="space-y-5">
              
              {/* Email Input Column */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Clinical Email ID
                </Label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="s.kulkarni@niloufer.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-aether-void/60 border border-aether-ink focus:border-pulse-cyan focus-visible:ring-pulse-cyan/25 text-slate-100 pl-9 rounded-md h-10 text-xs transition-all font-mono placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Password Input Column */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                    Clinical Passcode
                  </Label>
                  <span className="text-[9px] font-bold text-pulse-cyan/70 hover:text-pulse-cyan cursor-pointer transition-colors uppercase tracking-widest font-sans">
                    Forgot Key?
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-aether-void/60 border border-aether-ink focus:border-pulse-cyan focus-visible:ring-pulse-cyan/25 text-slate-100 pl-9 rounded-md h-10 text-xs transition-all font-mono placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Standard login button */}
              <Button
                type="submit"
                className="w-full h-10 bg-aether-slate border border-aether-ink hover:bg-aether-slate/80 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all font-sans cursor-pointer"
              >
                Sign In Credentials
              </Button>
            </form>

            {/* Separator lines */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-aether-ink/60"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-widest leading-none font-mono">
                <span className="bg-aether-midnight px-3 text-slate-500">Or Demo Sandbox</span>
              </div>
            </div>

            {/* Premium Demo Bypass Button: gradient-ai background, hover shimmer sweep */}
            <button
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber hover:brightness-110 text-aether-void font-bold text-xs uppercase tracking-wider rounded-md shadow-lg shadow-pulse-cyan/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-space relative overflow-hidden group border border-white/10"
            >
              {/* Shimmer sweep effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-aether-void" />
                  Decrypting Bio-Handshake...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In as Coordinator (Demo Bypass)
                </>
              )}
            </button>

            {/* Small cyan bypass link */}
            <div className="text-center mt-5">
              <button
                onClick={handleDemoSignIn}
                className="inline-flex items-center gap-1 text-[10px] text-pulse-cyan hover:text-pulse-cyan/80 font-bold uppercase tracking-widest font-mono animate-pulse"
              >
                Launch Live Sandbox Simulator
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>

          {/* Footer details */}
          <CardFooter className="p-6 pt-0 border-t border-aether-ink bg-aether-void/40 flex justify-between items-center text-[9px] text-slate-500 font-semibold uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-pulse-emerald" />
              SHA-256 local database active
            </span>
            <span className="hover:text-pulse-cyan cursor-pointer transition-colors" onClick={() => router.push("/register")}>
              Create Hospital Account
            </span>
          </CardFooter>

        </Card>
      </motion.div>

    </div>
  );
}
