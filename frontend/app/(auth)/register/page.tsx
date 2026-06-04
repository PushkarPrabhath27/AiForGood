"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, Hospital, Mail } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CoordinatorRegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [hospital, setHospital] = React.useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !hospital) {
      toast.warning("Please populate all onboarding coordinates.");
      return;
    }
    toast.success("Demo registration parsed successfully! Routing to login.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-aether-void flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Full-screen Animated Neural Mesh Grid Background */}
      <div className="absolute inset-0 neural-mesh opacity-[0.06] pointer-events-none" />

      {/* Visual Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-pulse-cyan/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pulse-magenta/5 blur-[140px] pointer-events-none" />

      {/* Onboarding Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10 relative"
      >
        <Card className="aether-glass border border-pulse-cyan/15 rounded-xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber opacity-60" />
          
          <CardHeader className="p-8 pb-4 flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-aether-slate border border-pulse-cyan/20 flex items-center justify-center text-xl shadow-lg shadow-black/40 mb-2 relative overflow-hidden group">
              <span className="relative z-10 filter drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">🏨</span>
              <div className="absolute inset-0 bg-pulse-cyan/5 group-hover:bg-pulse-cyan/10 transition-colors" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pulse-cyan to-life-rose bg-clip-text text-transparent font-space">
              Clinical Account Setup
            </CardTitle>
            <CardDescription className="text-[10px] text-pulse-cyan font-semibold uppercase tracking-widest font-mono">
              ONBOARD HEALTHCARE INSTITIUTE COORDINATES
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-2">
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Name field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Coordinator Full Name
                </Label>
                <div className="relative flex items-center">
                  <UserPlus className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Dr. S. Kulkarni"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-aether-void/60 border border-aether-ink focus:border-pulse-cyan focus-visible:ring-pulse-cyan/25 text-slate-100 pl-9 rounded-md h-10 text-xs transition-all font-mono"
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Clinical Email Address
                </Label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="s.kulkarni@niloufer.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-aether-void/60 border border-aether-ink focus:border-pulse-cyan focus-visible:ring-pulse-cyan/25 text-slate-100 pl-9 rounded-md h-10 text-xs transition-all font-mono"
                  />
                </div>
              </div>

              {/* Hospital field */}
              <div className="space-y-2">
                <Label htmlFor="hospital" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Medical Center / Blood Depot
                </Label>
                <div className="relative flex items-center">
                  <Hospital className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                  <Input
                    id="hospital"
                    type="text"
                    placeholder="Niloufer Children's Hospital"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    required
                    className="bg-aether-void/60 border border-aether-ink focus:border-pulse-cyan focus-visible:ring-pulse-cyan/25 text-slate-100 pl-9 rounded-md h-10 text-xs transition-all font-mono"
                  />
                </div>
              </div>

              {/* Register Action Button */}
              <button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-pulse-cyan via-pulse-magenta to-pulse-amber hover:brightness-110 text-aether-void font-bold text-xs uppercase tracking-wider rounded-md shadow-lg shadow-pulse-cyan/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-space relative overflow-hidden group border border-white/10 mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                Onboard Institute
              </button>
            </form>
          </CardContent>

          {/* Footer Back link */}
          <CardFooter className="p-6 pt-0 border-t border-aether-ink bg-aether-void/40 flex justify-center items-center font-mono">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/login")}
              className="text-slate-500 hover:text-pulse-cyan text-[9px] uppercase font-bold tracking-widest cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to gateway
            </Button>
          </CardFooter>

        </Card>
      </motion.div>

    </div>
  );
}
