"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ChurnRiskBadge } from "./ChurnRiskBadge";
import { FatigueMeter } from "./FatigueMeter";
import type { Guardian, GuardianStatus } from "@/../shared/contracts/api.types";

export interface GuardianNodeProps {
  guardian: Guardian;
  nodeX: number;
  nodeY: number;
  onClick: (g: Guardian) => void;
}

const statusColors: Record<GuardianStatus, { stroke: string; fill: string; outerRing: string; isPulse: boolean }> = {
  active: {
    stroke: "#06B6D4",
    fill: "fill-accent-cyan",
    outerRing: "#06B6D4",
    isPulse: false,
  },
  cooldown: {
    stroke: "#64748b",
    fill: "fill-slate-650",
    outerRing: "#475569",
    isPulse: false,
  },
  pending: {
    stroke: "#EC4899",
    fill: "fill-accent-pink",
    outerRing: "#EC4899",
    isPulse: true,
  },
  unavailable: {
    stroke: "#F43F5E",
    fill: "fill-accent-rose",
    outerRing: "#F43F5E",
    isPulse: false,
  },
  empty: {
    stroke: "#334155",
    fill: "fill-transparent",
    outerRing: "transparent",
    isPulse: false,
  },
};

export function GuardianNode({
  guardian,
  nodeX,
  nodeY,
  onClick,
}: GuardianNodeProps) {
  const [hovered, setHovered] = React.useState(false);
  const colors = statusColors[guardian.status];

  // Role visual representation
  const getRoleBadge = () => {
    if (guardian.role === "primary") return "P";
    if (guardian.role === "secondary") return "S";
    return "R"; // Rare Specialist
  };

  return (
    <motion.g
      onClick={() => onClick(guardian)}
      role="button"
      tabIndex={0}
      aria-label={`Guardian: ${guardian.name}. Status: ${guardian.status}. Role: ${guardian.role}.`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(guardian);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        x: hovered ? (300 - nodeX) * 0.05 : 0, // Magnetic pull towards patient core
        y: hovered ? (300 - nodeY) * 0.05 : 0,
        scale: hovered ? 1.3 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      opacity={guardian.status === "cooldown" ? (hovered ? 0.75 : 0.5) : 1}
      className="cursor-pointer outline-none select-none group"
    >
      <defs>
        <filter id={`neonNodeGlow-${guardian.id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* SVG Outer Glow Ring */}
      {guardian.status !== "empty" && (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={28}
          fill="none"
          stroke={colors.outerRing}
          strokeOpacity={hovered ? 0.35 : 0.15}
          strokeWidth={hovered ? 5 : 3}
          className="transition-all duration-200"
        />
      )}

      {/* Pending सुरेश expands an active ping ring */}
      {guardian.status === "pending" && (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={26}
          fill="none"
          stroke="#EC4899"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          className="animate-ping origin-center"
          style={{ transformOrigin: `${nodeX}px ${nodeY}px` }}
        />
      )}

      {/* Inner Node Circle */}
      <circle
        cx={nodeX}
        cy={nodeY}
        r={22}
        fill="#0B0F1F"
        stroke={colors.stroke}
        strokeWidth={2}
        className={cn(
          "transition-all duration-200",
          colors.isPulse && "animate-pulse"
        )}
        style={{
          filter: hovered && guardian.status !== "empty" && guardian.status !== "cooldown" ? `url(#neonNodeGlow-${guardian.id})` : undefined,
        }}
      />

      {/* Star / Icon in Center */}
      {guardian.status !== "empty" ? (
        <g transform={`translate(${nodeX - 7}, ${nodeY - 7})`} className="pointer-events-none">
          <Star
            style={{ fill: colors.stroke, stroke: colors.stroke }}
            className="w-3.5 h-3.5"
          />
        </g>
      ) : (
        <circle
          cx={nodeX}
          cy={nodeY}
          r={18}
          fill="none"
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray="4 3"
          className="pointer-events-none"
        />
      )}

      {/* Label: Guardian Name in custom monospace tag */}
      {guardian.status !== "empty" && (
        <g className="pointer-events-none font-mono">
          <rect
            x={nodeX - 45}
            y={nodeY + 28}
            width={90}
            height={16}
            rx={4}
            fill="#0B0F1F"
            fillOpacity={0.9}
            stroke={hovered ? "#06B6D4" : "rgba(6, 182, 212, 0.08)"}
            strokeWidth={0.8}
            className="transition-all"
          />
          <text
            x={nodeX}
            y={nodeY + 39}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={hovered ? "#06B6D4" : "#cbd5e1"}
            className="uppercase tracking-widest"
          >
            {guardian.name.split(" ")[0]}
          </text>
        </g>
      )}

      {/* Role Badge Indicator */}
      {guardian.status !== "empty" && (
        <g className="pointer-events-none font-mono">
          <circle
            cx={nodeX + 16}
            cy={nodeY - 16}
            r={6.5}
            fill={
              guardian.role === "primary"
                ? "#EC4899"
                : guardian.role === "secondary"
                ? "#06B6D4"
                : "#ffd166"
            }
            stroke="#0B0F1F"
            strokeWidth={1}
          />
          <text
            x={nodeX + 16}
            y={nodeY - 13.5}
            textAnchor="middle"
            fontSize="7"
            fontWeight="black"
            fill="#0B0F1F"
          >
            {getRoleBadge()}
          </text>
        </g>
      )}

      {/* Churn Risk Badge */}
      {guardian.status !== "empty" && guardian.engagement_trend && guardian.engagement_trend !== "stable" && (
        <foreignObject x={nodeX + 8} y={nodeY - 26} width={24} height={24}>
          <ChurnRiskBadge
            trend={guardian.engagement_trend}
            cusumScore={guardian.cusum_score ?? 0}
          />
        </foreignObject>
      )}

      {/* Fatigue Meter */}
      {guardian.status !== "empty" && (
        <foreignObject x={nodeX - 45} y={nodeY + 44} width={90} height={28}>
          <FatigueMeter
            annual_donation_count={guardian.annual_donation_count ?? 0}
            fatigue_ceiling={guardian.fatigue_ceiling ?? 6}
            is_eligible={guardian.is_eligible !== false}
            fatigue_rest_until={guardian.fatigue_rest_until ?? null}
          />
        </foreignObject>
      )}
    </motion.g>
  );
}
