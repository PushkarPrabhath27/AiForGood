"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { BloodBankNode, HealthStatus } from "@/../shared/contracts/api.types";

import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon broken paths in Next.js
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// CSS injection for high-fidelity holographic beacons in AETHER theme
const mapStyles = `
  @keyframes pulse-ring {
    0% { transform: scale(0.9); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.5; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  .leaflet-container {
    background: #050508 !important;
  }
  .leaflet-bar {
    border: 1px solid rgba(0, 240, 255, 0.15) !important;
    border-radius: 6px !important;
    overflow: hidden !important;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.05) !important;
  }
  .leaflet-bar a {
    background-color: #0a0e1a !important;
    color: #94a3b8 !important;
    border-bottom: 1px solid rgba(0, 240, 255, 0.1) !important;
    transition: all 0.2s !important;
  }
  .leaflet-bar a:hover {
    background-color: #141b2d !important;
    color: #00f0ff !important;
  }
  .leaflet-popup-content-wrapper {
    background-color: #0a0e1a !important;
    color: #f8fafc !important;
    border: 1px solid rgba(0, 240, 255, 0.15) !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(15px);
  }
  .leaflet-popup-tip {
    background-color: #0a0e1a !important;
    border: 1px solid rgba(0, 240, 255, 0.15) !important;
  }
`;

export interface CityBloodMapInnerProps {
  bloodBanks: BloodBankNode[];
  matchedBankIds: string[];
  selectedBankId: string | null;
  onBankSelect: (bankId: string) => void;
}

// Custom DivIcon with Aether bio-digital shapes (Hexagon, Diamond, Triangle)
const createBeaconIcon = (status: HealthStatus, hasMatch: boolean, isSelected: boolean) => {
  const configs = {
    green: { 
      bg: "#00f0ff", 
      glow: "rgba(0, 240, 255, 0.4)", 
      ring: "#00f0ff",
      clip: "clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);", // Hexagon
      shapeClass: "hexagon"
    },
    yellow: { 
      bg: "#ffb703", 
      glow: "rgba(255, 183, 3, 0.4)", 
      ring: "#ffb703",
      clip: "clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);", // Diamond
      shapeClass: "diamond"
    },
    red: { 
      bg: "#ff006e", 
      glow: "rgba(255, 0, 110, 0.4)", 
      ring: "#ff006e",
      clip: "clip-path: polygon(50% 0%, 0% 100%, 100% 100%);", // Triangle
      shapeClass: "triangle animate-pulse"
    },
  };
  
  const activeCfg = configs[status === "yellow" ? "yellow" : status === "red" ? "red" : "green"];

  const borderStyle = isSelected ? "border: 2px solid #ffffff; box-shadow: 0 0 15px #ffffff;" : "border: 1px solid rgba(255, 255, 255, 0.15);";
  const selectScale = isSelected ? "transform: scale(1.15);" : "";

  return L.divIcon({
    className: "custom-beacon",
    html: `
      <div style="position:relative;width:44px;height:44px;${selectScale}">
        ${
          hasMatch || isSelected || status === "red"
            ? `<div class="match-pulse" style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${activeCfg.ring};animation:pulse-ring 2s infinite;"></div>`
            : ""
        }
        <div style="position:absolute;inset:0;background:${
          activeCfg.bg
        };box-shadow:0 0 15px ${activeCfg.glow};display:flex;align-items:center;justify-content:center;${borderStyle} ${activeCfg.clip}">
          <span style="font-size: 9px; color: #050508; font-weight: 900; font-family: 'JetBrains Mono', monospace;">
            ${status === "green" ? "B+" : status === "yellow" ? "B+" : "B+"}
          </span>
        </div>
        <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:#0a0a0f;color:${
          activeCfg.bg
        };font-size:8px;font-family:monospace;font-weight:700;padding:1px 5px;border-radius:4px;border: 1px solid ${activeCfg.ring}40;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);">
          ${hasMatch ? "MATCH" : status === "yellow" ? "LOW" : status.toUpperCase()}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
};

function MapInstanceTracker({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  React.useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

export function CityBloodMapInner({
  bloodBanks,
  matchedBankIds,
  selectedBankId,
  onBankSelect,
}: CityBloodMapInnerProps) {
  const hyderabadCenter: [number, number] = [17.385, 78.4867];
  const mapRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (e) {
          console.warn("[Leaflet Map Clean Up Warn]:", e);
        }
      }
    };
  }, []);

  return (
    <div
      className="w-full h-full relative rounded-xl overflow-hidden select-none"
      style={{ border: "1px solid var(--bg-border)", background: "var(--bg-void)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: mapStyles }} />

      <MapContainer
        center={hyderabadCenter}
        zoom={12}
        className="w-full h-full min-h-[400px] z-10"
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <MapInstanceTracker mapRef={mapRef} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          opacity={0.65}
        />

        {bloodBanks.map((bank) => {
          const hasMatch = matchedBankIds.includes(bank.id);
          const isSelected = selectedBankId === bank.id;
          
          return (
            <Marker
              key={bank.id}
              position={[bank.lat, bank.lng]}
              icon={createBeaconIcon(bank.status, hasMatch, isSelected)}
              eventHandlers={{
                click: () => {
                  onBankSelect(bank.id);
                },
              }}
            >
              <Popup>
                <div className="p-1 font-mono text-[9px] max-w-[200px]">
                  <h4 className="font-bold text-white text-xs leading-tight mb-1 font-space uppercase">
                    {bank.name}
                  </h4>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                    Last sync: {new Date(bank.last_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-aether-ink pt-2 text-[8px]">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">
                      {hasMatch ? "Matched Node" : "Bank Registry"}
                    </span>
                    <span
                      className={`font-bold uppercase tracking-widest ${
                        bank.status === "green"
                          ? "text-pulse-cyan"
                          : bank.status === "yellow"
                          ? "text-pulse-amber"
                          : "text-pulse-magenta"
                      }`}
                    >
                      {bank.status === "yellow" ? "LOW" : bank.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default CityBloodMapInner;
