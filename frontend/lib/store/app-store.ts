import { create } from "zustand";

export interface AppState {
  sidebarOpen: boolean;
  selectedPatientId: string | null;
  activeView: "noor" | "guardian" | "grid";
  toggleSidebar: () => void;
  setPatient: (id: string | null) => void;
  setView: (v: "noor" | "guardian" | "grid") => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  selectedPatientId: null,
  activeView: "noor",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setPatient: (id) => set({ selectedPatientId: id }),
  setView: (v) => set({ activeView: v }),
}));
