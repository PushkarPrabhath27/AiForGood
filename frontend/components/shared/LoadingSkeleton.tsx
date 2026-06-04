"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export type SkeletonVariant = "card" | "chart" | "table" | "text";

export interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant,
  lines = 3,
  className,
}: LoadingSkeletonProps) {
  const renderedLines = Array.from({ length: lines });

  if (variant === "chart") {
    return (
      <div
        className={cn(
          "w-full h-80 aether-glass border border-pulse-cyan/10 rounded-xl p-6 flex flex-col justify-between select-none relative overflow-hidden",
          className
        )}
        aria-label="Loading clinical chart data..."
        role="status"
      >
        {/* Animated Mesh Grid underneath skeleton */}
        <div className="absolute inset-0 neural-mesh opacity-[0.02] pointer-events-none" />
        
        <div className="flex justify-between items-center mb-4 relative z-10">
          <Skeleton className="h-6 w-1/4 shimmer-heartbeat animate-none rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12 shimmer-heartbeat animate-none rounded-md" />
            <Skeleton className="h-6 w-16 shimmer-heartbeat animate-none rounded-md" />
          </div>
        </div>
        <div className="flex-1 flex gap-4 items-end justify-between px-2 pt-6 relative z-10">
          <Skeleton className="h-[20%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[50%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[35%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[75%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[60%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[40%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[80%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
          <Skeleton className="h-[90%] w-[8%] shimmer-heartbeat animate-none rounded-t-lg" />
        </div>
        <div className="flex justify-between items-center mt-4 pt-2 border-t border-aether-ink/40 relative z-10">
          <Skeleton className="h-4 w-12 shimmer-heartbeat animate-none rounded-md" />
          <Skeleton className="h-4 w-12 shimmer-heartbeat animate-none rounded-md" />
          <Skeleton className="h-4 w-12 shimmer-heartbeat animate-none rounded-md" />
          <Skeleton className="h-4 w-12 shimmer-heartbeat animate-none rounded-md" />
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card
        className={cn("aether-glass border border-pulse-cyan/10 rounded-xl overflow-hidden shadow-2xl relative", className)}
        aria-label="Loading panel details..."
        role="status"
      >
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/3 shimmer-heartbeat animate-none rounded-md" />
            <Skeleton className="h-6 w-16 shimmer-heartbeat animate-none rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/2 shimmer-heartbeat animate-none mt-2 rounded-md" />
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          {renderedLines.map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-full shimmer-heartbeat animate-none rounded-md" />
              {index === renderedLines.length - 1 && (
                <Skeleton className="h-4 w-2/3 shimmer-heartbeat animate-none rounded-md" />
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-6 pt-0 border-t border-aether-ink/40 flex justify-between items-center h-14">
          <Skeleton className="h-4 w-1/4 shimmer-heartbeat animate-none rounded-md" />
          <Skeleton className="h-4 w-16 shimmer-heartbeat animate-none rounded-md" />
        </CardFooter>
      </Card>
    );
  }

  if (variant === "table") {
    return (
      <div
        className={cn(
          "w-full aether-glass border border-pulse-cyan/10 rounded-xl p-6 space-y-4 relative overflow-hidden",
          className
        )}
        aria-label="Loading grid items..."
        role="status"
      >
        <div className="flex items-center justify-between border-b border-aether-ink/50 pb-4">
          <Skeleton className="h-5 w-1/4 shimmer-heartbeat animate-none rounded-md" />
          <Skeleton className="h-8 w-24 shimmer-heartbeat animate-none rounded-md" />
        </div>
        <div className="space-y-3">
          {renderedLines.map((_, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2.5 border-b border-aether-ink/30 last:border-0"
            >
              <Skeleton className="h-4 w-[20%] shimmer-heartbeat animate-none rounded-md" />
              <Skeleton className="h-4 w-[15%] shimmer-heartbeat animate-none rounded-md" />
              <Skeleton className="h-4 w-[25%] shimmer-heartbeat animate-none rounded-md" />
              <Skeleton className="h-4 w-[10%] shimmer-heartbeat animate-none rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: text variant
  return (
    <div
      className={cn("space-y-3 p-4 bg-aether-midnight/40 border border-aether-ink rounded-xl", className)}
      aria-label="Loading text content..."
      role="status"
    >
      {renderedLines.map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4 shimmer-heartbeat animate-none rounded-md",
            index === 0 && "w-[90%]",
            index === 1 && "w-[85%]",
            index === 2 && "w-[95%]",
            index > 2 && "w-[80%]"
          )}
        />
      ))}
    </div>
  );
}
