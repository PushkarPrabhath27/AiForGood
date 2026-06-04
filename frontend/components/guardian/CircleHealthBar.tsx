"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, HeartHandshake, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CircleHealthBarProps {
  coverage: number;
  engagement: number;
  resilience: number;
}

interface GaugeConfig {
  score: number;
  title: string;
  subtext: string;
  icon: React.ReactNode;
}

export function CircleHealthBar({
  coverage = 88,
  engagement = 94,
  resilience = 87,
}: CircleHealthBarProps) {
  const configs: GaugeConfig[] = [
    {
      score: coverage,
      title: "Coverage Score",
      subtext: `${Math.round(coverage / 12.5)} of 8 Guardians Ready`,
      icon: <ShieldCheck className="w-4 h-4 text-accent-cyan" />,
    },
    {
      score: engagement,
      title: "Engagement Score",
      subtext: "Avg Response 4.2 hours",
      icon: <HeartHandshake className="w-4 h-4 text-accent-pink" />,
    },
    {
      score: resilience,
      title: "Resilience Score",
      subtext: "Survives 2 active absences",
      icon: <Zap className="w-4 h-4 text-accent-amber" />,
    },
  ];

  // Helper for dynamic score colors
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10B981"; // text-emerald-400
    if (score >= 50) return "#F59E0B"; // text-amber-400
    return "#EF4444"; // text-rose-400
  };

  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full select-none">
      {configs.map((cfg, index) => {
        const scoreColor = getScoreColor(cfg.score);

        return (
          <Card 
            key={index} 
            className="bg-gradient-to-b from-bg-secondary to-bg-tertiary aether-glass border border-bg-hover rounded-xl p-5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.15)]"
          >
            <div className="absolute inset-0 neural-mesh opacity-[0.01] pointer-events-none" />
            
            <CardContent className="p-0 flex flex-col items-center space-y-4 relative z-10 w-full">
              {/* Radial SVG Gauge */}
              <div className="relative w-[120px] h-[120px] flex items-center justify-center font-mono">
                <svg width="120" height="120" viewBox="0 0 120 120" className="select-none">
                  <defs>
                    {/* Cyan to Blue to Violet gradient stroke */}
                    <linearGradient id={`gradientStroke-${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="50%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                    <filter id={`shadowGlow-${index}`}>
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Background track circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="6"
                  />
                  {/* Animating status circle */}
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={`url(#gradientStroke-${index})`}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - cfg.score / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    transform="rotate(-90 60 60)"
                    style={{ filter: `url(#shadowGlow-${index})` }}
                  />
                  {/* SVG Center Score Value (Dynamic Color) */}
                  <text
                    x="60"
                    y="63"
                    textAnchor="middle"
                    fill={scoreColor}
                    fontSize="22"
                    fontWeight="800"
                    className="font-mono tabular-nums"
                  >
                    {cfg.score}
                  </text>
                  <text
                    x="60"
                    y="76"
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="7"
                    fontWeight="bold"
                    letterSpacing="0.12em"
                    className="font-mono"
                  >
                    SCORE
                  </text>
                </svg>
              </div>

              {/* Title & Status Labels in normal sentence case */}
              <div className="space-y-1 w-full">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-center gap-1.5 leading-none tracking-normal">
                  {cfg.icon}
                  {cfg.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium tracking-normal mt-0.5">
                  {cfg.subtext}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
