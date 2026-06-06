"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO } from "@/lib/constants";
import { GuardianNode } from "./GuardianNode";
import type { Guardian } from "@/../shared/contracts/api.types";

export interface GuardianConstellationProps {
  patientName: string;
  guardians: Guardian[];
  onNodeClick: (g: Guardian) => void;
}

// Particle burst component
const ParticleBurst = ({ x, y }: { x: number; y: number }) => (
  <g>
    {[...Array(16)].map((_, i) => (
      <motion.circle
        key={i}
        cx={x}
        cy={y}
        r={2.5}
        fill="#EC4899"
        initial={{ opacity: 1, x: 0, y: 0 }}
        animate={{
          opacity: 0,
          x: Math.cos((i * Math.PI) / 8) * 90,
          y: Math.sin((i * Math.PI) / 8) * 90,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    ))}
  </g>
);

export function GuardianConstellation({
  patientName = "Priya",
  guardians,
  onNodeClick,
}: GuardianConstellationProps) {
  const [triggerCelebration, setTriggerCelebration] = React.useState(false);
  const prevSureshStatusRef = React.useRef<string>("pending");

  // Track Suresh's status change dynamically
  const suresh = guardians.find((g) => g.id === DEMO.GUARDIAN_SURESH_ID);
  const currentSureshStatus = suresh ? suresh.status : "pending";

  React.useEffect(() => {
    if (
      prevSureshStatusRef.current === "pending" &&
      currentSureshStatus === "active"
    ) {
      setTriggerCelebration(true);
      // Automatically turn off celebration trigger after duration
      const timer = setTimeout(() => setTriggerCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
    prevSureshStatusRef.current = currentSureshStatus;
  }, [currentSureshStatus]);

  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 768) {
          setScale(0.5);
        } else {
          setScale(1);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nodes = React.useMemo(() => {
    const total = guardians.length || 1;
    return guardians.map((g, index) => {
      // Map all nodes to a constant radius to form a perfect circle
      const r = 200 * scale;
      // Divide angles evenly starting from the top (-Math.PI / 2)
      const angle = (index * 2 * Math.PI) / total - Math.PI / 2;

      return {
        guardian: g,
        x: 300 + r * Math.cos(angle),
        y: 300 + r * Math.sin(angle),
        angle,
      };
    });
  }, [guardians, scale]);

  // Find Suresh's specific coordinates for burst origin
  const sureshCoords = React.useMemo(() => {
    const sNode = nodes.find((n) => n.guardian.id === DEMO.GUARDIAN_SURESH_ID);
    return sNode ? { x: sNode.x, y: sNode.y } : { x: 300, y: 300 };
  }, [nodes]);

  // Twinkling starfield static setup (done once)
  const starfield = React.useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      cx: Math.random() * 600,
      cy: Math.random() * 600,
      r: Math.random() * 1.5 + 0.5,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
    }));
  }, []);

  // Organic blob path animation states
  const blobPath1 = "M 0 -38 C 22 -38, 38 -22, 38 0 C 38 22, 22 38, 0 38 C -22 38, -38 22, -38 0 C -38 -22, -22 -38, 0 -38 Z";
  const blobPath2 = "M 0 -42 C 26 -35, 42 -14, 37 5 C 32 24, 14 42, -5 37 C -24 32, -42 14, -37 -5 C -32 -24, -26 -42, 0 -42 Z";

  return (
    <div className="relative w-full max-w-[600px] mx-auto aspect-square bg-bg-primary/60 border border-bg-hover rounded-xl overflow-hidden shadow-2xl p-4">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Aether AI & Life gradients */}
          <linearGradient id="aetherAiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          <linearGradient id="aetherLifeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>

          {/* Golden auric glows */}
          <filter id="centerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Drift Neural Mesh grid lines in background */}
        <g opacity="0.4" className="pointer-events-none">
          {[...Array(13)].map((_, i) => (
            <line key={`grid-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" stroke="rgba(6, 182, 212, 0.03)" strokeWidth="0.5" />
          ))}
          {[...Array(13)].map((_, i) => (
            <line key={`grid-y-${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} stroke="rgba(6, 182, 212, 0.03)" strokeWidth="0.5" />
          ))}
        </g>

        {/* 2. Twinkling Starfield Background */}
        {starfield.map((star) => (
          <motion.circle
            key={`star-${star.id}`}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill="#ffffff"
            animate={{ opacity: [0.1, 0.7, 0.1] }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* 3. Constellation Rays connecting guardians to core */}
        {nodes.map((node) => {
          const isActiveRay = node.guardian.status === "active";
          const isSureshRay = node.guardian.id === DEMO.GUARDIAN_SURESH_ID;
          const showRay = node.guardian.status !== "empty" && node.guardian.status !== "cooldown";

          if (!showRay) return null;

          return (
            <motion.line
              key={`line-${node.guardian.id}`}
              x1="300"
              y1="300"
              x2={node.x}
              y2={node.y}
              stroke={isActiveRay ? "#06B6D4" : "#EC4899"}
              animate={{
                strokeWidth: isSureshRay && triggerCelebration ? [2, 5, 2] : 1.2,
                opacity: isSureshRay && triggerCelebration ? [0.3, 0.85, 0.3] : isActiveRay ? 0.35 : 0.25,
              }}
              transition={{ duration: 1.5 }}
              strokeDasharray={node.guardian.status === "pending" ? "4 3" : undefined}
            />
          );
        })}

        {/* 4. Data Flows: small cyan dots traveling along active vector lines TOWARDS THE CENTER */}
        {nodes.map((node) => {
          if (node.guardian.status !== "active") return null;

          return (
            <motion.circle
              key={`data-dot-${node.guardian.id}`}
              r={2}
              fill="#06B6D4"
              filter="url(#centerGlow)"
              initial={{ cx: node.x, cy: node.y, opacity: 0.2 }}
              animate={{ cx: 300, cy: 300, opacity: [0.2, 1, 0.4] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 1.5
              }}
            />
          );
        })}

        {/* 5. Center organic breathing blob core in Space Grotesk */}
        <g transform="translate(300, 300)">
          {/* Organic Morphing SVG blob shape wrapped in pulsing group */}
          <motion.g
            animate={{
              scale: [0.93, 1.07, 0.93],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.path
              d={blobPath1}
              animate={{
                d: [blobPath1, blobPath2, blobPath1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              fill="url(#aetherLifeGrad)"
              filter="url(#centerGlow)"
              style={{ originX: 0.5, originY: 0.5 }}
            />
          </motion.g>
          <text
            dy="5"
            textAnchor="middle"
            fill="#0B0F1F"
            fontWeight="bold"
            fontSize="13"
            className="font-space pointer-events-none tracking-wider uppercase"
          >
            {patientName.split(" ")[0]}
          </text>
        </g>

        {/* 6. Celebration Sequences (Cyan ripples & particles) */}
        <AnimatePresence>
          {triggerCelebration && (
            <g>
              {/* Ripple expanding rings */}
              <motion.circle
                cx={sureshCoords.x}
                cy={sureshCoords.y}
                initial={{ r: 32, opacity: 1, strokeWidth: 3 }}
                animate={{ r: 120, opacity: 0, strokeWidth: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                fill="none"
                stroke="#00f0ff"
              />

              {/* Cyan Particle burst */}
              <ParticleBurst x={sureshCoords.x} y={sureshCoords.y} />

              {/* Floating CONFIRMED banner with typewriter typing effect */}
              <motion.g
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: [0, 1, 1, 0], y: [-20, 0, 0, -10] }}
                transition={{ duration: 2.5, times: [0, 0.12, 0.6, 1] }}
                transform={`translate(${sureshCoords.x}, ${sureshCoords.y - 45})`}
              >
                <text
                  textAnchor="middle"
                  fill="#ffd166"
                  fontWeight="bold"
                  fontSize="9"
                  className="font-mono uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(255,209,102,0.6)]"
                >
                  CONFIRMED
                </text>
              </motion.g>
            </g>
          )}
        </AnimatePresence>

        {/* 7. Nodes Arrangement */}
        {nodes.map((node) => {
          const isSuresh = node.guardian.id === DEMO.GUARDIAN_SURESH_ID;
          
          return (
            <g key={node.guardian.id}>
              {isSuresh && triggerCelebration ? (
                <motion.g
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <GuardianNode
                    guardian={node.guardian}
                    nodeX={node.x}
                    nodeY={node.y}
                    onClick={onNodeClick}
                  />
                </motion.g>
              ) : (
                <GuardianNode
                  guardian={node.guardian}
                  nodeX={node.x}
                  nodeY={node.y}
                  onClick={onNodeClick}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
