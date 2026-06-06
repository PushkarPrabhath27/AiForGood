"use client";

import * as React from "react";
import { signIn, signUp, confirmSignUp } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Mail, UserPlus, Check, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "signin" | "signup" | "confirm";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<AuthMode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn({ username: email, password });
      toast.success("Successfully logged into RaktaSetu NOOR");
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Sign in failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password.");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
      setMode("confirm");
      toast.success("Account created! Verification code sent to email.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Sign up failed. Ensure password requirements met.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code) {
      toast.error("Please enter both email and verification code.");
      return;
    }
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setMode("signin");
      toast.success("Account confirmed! You can now sign in.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Verification code confirmation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 select-none relative overflow-hidden"
      style={{ background: "var(--bg-void)" }}
    >
      {/* Background visual decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-950/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-950/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl shadow-black/40 z-10"
      >
        <div className="mb-8 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{
                background: "rgba(230, 57, 70, 0.12)",
                border: "1px solid rgba(230, 57, 70, 0.35)",
              }}
            >
              🩸
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 font-display">
              RaktaSetu <span className="text-rose-500">NOOR</span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
            Clinical Blood Care Platform
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "signin" && (
            <motion.form
              key="signin"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSignIn}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-slate-400 font-semibold">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@hospital.org"
                    className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 pl-10 h-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-slate-400 font-semibold">
                  Secure Password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 pl-10 h-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 mt-2 flex items-center justify-center gap-1.5 rounded-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="text-center pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create a coordinator account
                </button>
              </div>
            </motion.form>
          )}

          {mode === "signup" && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSignUp}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-xs text-slate-400 font-semibold">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@hospital.org"
                    className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 pl-10 h-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-xs text-slate-400 font-semibold">
                  Secure Password (min. 8 chars)
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 pl-10 h-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 mt-2 flex items-center justify-center gap-1.5 rounded-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Register Account
                  </>
                )}
              </Button>

              <div className="text-center pt-3 border-t border-slate-800/80 space-y-2">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors block mx-auto font-semibold"
                >
                  Already have an account? Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("confirm")}
                  className="text-[10px] text-slate-500 hover:text-slate-350 block mx-auto font-semibold uppercase tracking-wider"
                >
                  Enter confirmation code
                </button>
              </div>
            </motion.form>
          )}

          {mode === "confirm" && (
            <motion.form
              key="confirm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleConfirm}
              className="space-y-4"
            >
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                Please enter the verification code sent to your email to activate your account.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-email" className="text-xs text-slate-400 font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder="name@hospital.org"
                    className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 pl-10 h-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-code" className="text-xs text-slate-400 font-semibold">
                  Verification Code
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirm-code"
                    type="text"
                    placeholder="e.g. 123456"
                    className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 pl-10 h-9 font-mono"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 mt-2 flex items-center justify-center gap-1.5 rounded-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Verify Code
                  </>
                )}
              </Button>

              <div className="text-center pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
