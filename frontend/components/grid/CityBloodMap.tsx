"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import type { CityBloodMapInnerProps } from "./CityBloodMapInner";

// Safely wrap Leaflet to prevent "window is not defined" SSR node runtime crashes.
const CityBloodMapInner = dynamic<CityBloodMapInnerProps>(
  () => import("./CityBloodMapInner").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <LoadingSkeleton variant="chart" />,
  }
);

export function CityBloodMap(props: CityBloodMapInnerProps) {
  return <CityBloodMapInner key="hyd-blood-map-static" {...props} />;
}

