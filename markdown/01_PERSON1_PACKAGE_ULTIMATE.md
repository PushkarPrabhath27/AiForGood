# Person 1 Implementation Package — Frontend + API Integration Layer
## RaktaSetu NOOR | AI-for-Good Hackathon Execution Manual

> **Owner:** Person 1 (Frontend Engineer + UI Architect)  
> **Scope:** `/frontend` directory + `shared/contracts/api.types.ts` + `shared/constants/index.ts`  
> **Runtime Target:** Cursor / Claude / Windsurf — paste-ready phase prompts  
> **Demo Anchor:** Priya's NOOR Dashboard → Guardian Constellation → RaktaGrid City Map  

---

## 1. Responsibilities & Boundaries

### What Person 1 OWNS (Absolute Authority)
| Path | Ownership |
|------|-----------|
| `/frontend/**` | All React components, pages, hooks, stores, styles, assets |
| `/frontend/lib/api/*.ts` | API client layer (Axios interceptors, typed wrappers) |
| `/frontend/lib/mocks/*.ts` | MSW mock handlers + fixture data (Priya, Vikram, demo banks) |
| `/frontend/components/noor/**` | NOOR Engine UI (Hb chart, alerts, timeline, patient header) |
| `/frontend/components/guardian/**` | Guardian Constellation (SVG star map, cards, health bars) |
| `/frontend/components/grid/**` | RaktaGrid UI (Leaflet map, bank markers, match cards, panels) |
| `/frontend/components/shared/**` | Reusable UI primitives (StatusPill, AlertBanner, Skeletons, ErrorBoundary) |
| `/frontend/components/layout/**` | Sidebar, TopNav, MobileNav, Dashboard shell |
| `/shared/contracts/api.types.ts` | TypeScript type definitions (generated from Person 2's JSON schema) |
| `/shared/constants/index.ts` | Shared constants (thresholds, colors, languages, demo IDs) |
| `docker-compose.yml` (frontend service block) | Dev container config |
| `.github/workflows/frontend.yml` | CI/CD pipeline |

### What Person 1 MUST NOT TOUCH (Zero Exceptions)
- `/backend/**` — any Python file, SQLAlchemy model, Alembic migration, FastAPI router
- `shared/contracts/api.schema.json` — owned by Person 2; Person 1 reads only
- Database schema design or migration scripts
- ML/AI Python code (Prophet, CUSUM, OR-Tools)
- Twilio/Sarvam/Claude server-side integration logic
- Supabase Row Level Security policies (server-side concern)

### APIs Person 1 CONSUMES (Zero Exposure)
Person 1 is a **pure consumer** of Person 2's REST API. All data flows via `process.env.NEXT_PUBLIC_API_URL`.

---

## 2. Technical Scope

| Area | Technology | Owner | Why |
|------|-----------|-------|-----|
| Frontend Framework | Next.js 14 (App Router) | P1 | SSR + RSC for fast dashboards; file-based routing |
| Language | TypeScript 5.4 (Strict Mode) | P1 | Zero `any` types; full intellisense |
| Styling | Tailwind CSS 3.4 + shadcn/ui | P1 | Rapid accessible UI without design debt |
| Charts | Recharts 2.12 | P1 | Declarative, composable, zero bundle bloat |
| Maps | Leaflet 1.9 + react-leaflet 4.2 | P1 | Open-source, city-level blood bank visualization |
| State (Server) | TanStack Query v5 (React Query) | P1 | Caching, polling, optimistic updates |
| State (Client) | Zustand 4.5 | P1 | Minimal boilerplate; UI-only state |
| API Client | Axios 1.7 + interceptors | P1 | Request/response transformation, auth header injection |
| Forms | React Hook Form 7.51 + Zod 3.23 | P1 | Type-safe validation aligned with backend Pydantic |
| Auth UI | Supabase Auth Helpers (SSR) | P1 | PKCE flow, cookie-based sessions |
| Mocking | MSW 2.3 (Mock Service Worker) | P1 | Network-level mocks; develop independently from Day 1 |
| Testing | Vitest 1.6 + Testing Library 15 | P1 | Fast unit tests; DOM assertions |
| Icons | Lucide React 0.378 | P1 | Consistent iconography |
| Dates | date-fns 3.6 | P1 | Immutable date math; never use `new Date()` arithmetic |
| Utilities | clsx 2.1 + tailwind-merge 2.3 | P1 | `cn()` utility for className composition |
| Deploy | Vercel (Pro not needed) | P1 | Zero-config Next.js deploy; free tier unlimited |

---

## 3. Exact Folder Structure

```
raktasetu-noor/
├── frontend/                          ← PERSON 1 OWNS ENTIRELY
│   ├── app/
│   │   ├── layout.tsx                 # Root layout: providers, fonts, metadata
│   │   ├── page.tsx                   # Landing / redirect to dashboard
│   │   ├── globals.css                # Tailwind directives + custom CSS vars
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx         # Supabase Auth UI wrapper
│   │   │   └── register/page.tsx      # Onboarding flow for coordinators
│   │   ├── dashboard/
│   │   │   ├── layout.tsx             # Sidebar + TopNav shell; auth guard
│   │   │   ├── page.tsx               # Overview: all patients grid
│   │   │   ├── patient/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # NOOR Engine dashboard (default tab)
│   │   │   │       ├── guardian/
│   │   │   │       │   └── page.tsx   # Guardian Constellation view
│   │   │   │       └── history/
│   │   │   │           └── page.tsx   # Transfusion history table
│   │   │   └── grid/
│   │   │       └── page.tsx           # RaktaGrid city map view
│   │   └── api/                       # Next.js Route Handlers (proxy only)
│   │       └── health/route.ts        # Simple health ping for Vercel
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   └── toast.tsx
│   │   ├── noor/                      # NOOR Engine domain components
│   │   │   ├── HbForecastChart.tsx    # THE sawtooth + projection chart
│   │   │   ├── ClinicalAlerts.tsx     # 3 status pills + expandable detail
│   │   │   ├── TransfusionTimeline.tsx# Historical cycles view
│   │   │   ├── PatientHeader.tsx     # Name, blood type, next transfusion
│   │   │   ├── HbReadingForm.tsx     # Log new Hb reading (RHF + Zod)
│   │   │   └── ForecastSummary.tsx   # Big number: "Nov 3rd, 89% confidence"
│   │   ├── guardian/                  # RaktaMitra domain components
│   │   │   ├── GuardianConstellation.tsx # SVG star map (THE emotional hook)
│   │   │   ├── GuardianCard.tsx       # Sheet/modal with guardian details
│   │   │   ├── CircleHealthBar.tsx    # Coverage / engagement / resilience
│   │   │   ├── MobilizationStatus.tsx # T-14 countdown + current status
│   │   │   └── GuardianNode.tsx       # Individual star node (hover/click states)
│   │   ├── grid/                      # RaktaGrid domain components
│   │   │   ├── CityBloodMap.tsx       # Leaflet map (dynamic import, SSR-safe)
│   │   │   ├── InventoryMatchCard.tsx # Match recommendation card
│   │   │   ├── BloodBankPanel.tsx     # Bank detail sidebar
│   │   │   ├── CityHealthScore.tsx    # Aggregate metric banner
│   │   │   └── MatchApprovalFlow.tsx  # Approve/reject transfer workflow
│   │   ├── shared/                    # Domain-agnostic reusable components
│   │   │   ├── StatusPill.tsx         # Color-coded pill with icon + text
│   │   │   ├── AlertBanner.tsx        # Full-width alert with retry action
│   │   │   ├── LoadingSkeleton.tsx    # shadcn Skeleton composition
│   │   │   ├── ErrorBoundary.tsx      # React error boundary + fallback UI
│   │   │   ├── PageHeader.tsx         # Title + breadcrumb + action button
│   │   │   └── EmptyState.tsx         # Illustration + CTA for zero data
│   │   └── layout/
│   │       ├── Sidebar.tsx            # Collapsible nav rail
│   │       ├── TopNav.tsx             # Search + notifications + profile
│   │       └── MobileNav.tsx          # Bottom sheet nav < 768px
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts              # Axios instance + interceptors
│   │   │   ├── patients.ts            # Patient API calls (typed)
│   │   │   ├── forecasts.ts           # Forecast API calls
│   │   │   ├── guardians.ts           # Guardian circle API calls
│   │   │   ├── grid.ts                # Inventory / grid API calls
│   │   │   └── alerts.ts              # Alert logging API calls
│   │   ├── hooks/
│   │   │   ├── usePatient.ts          # React Query: patient detail
│   │   │   ├── useForecast.ts         # React Query: forecast + polling
│   │   │   ├── useGuardianCircle.ts   # React Query: guardian data
│   │   │   ├── useCityInventory.ts    # React Query: grid data
│   │   │   ├── useHbReading.ts        # React Query mutation: log Hb
│   │   │   └── useMatchApproval.ts    # React Query mutation: approve match
│   │   ├── store/
│   │   │   └── app-store.ts           # Zustand: sidebar, selectedPatientId, viewMode
│   │   ├── mocks/
│   │   │   ├── browser.ts             # MSW browser setup
│   │   │   ├── handlers.ts            # Route handlers for all API contracts
│   │   │   └── fixtures.ts            # Demo data: Priya, Vikram, banks, guardians
│   │   └── utils/
│   │       ├── dates.ts               # date-fns wrappers
│   │       ├── blood-types.ts         # Compatibility matrix, formatting
│   │       ├── format.ts              # Number/date/format helpers
│   │       └── cn.ts                  # clsx + tailwind-merge (already in shadcn)
│   │
│   ├── public/
│   │   └── assets/
│   │       ├── logo.svg
│   │       ├── empty-state.svg
│   │       └── guardian-constellation-bg.svg
│   │
│   ├── styles/
│   │   └── globals.css                # (mirrors app/globals.css)
│   │
│   ├── tests/
│   │   ├── setup.ts                   # Vitest setup + Testing Library matchers
│   │   ├── noor/
│   │   │   └── HbForecastChart.test.tsx
│   │   └── guardian/
│   │       └── GuardianConstellation.test.tsx
│   │
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── vitest.config.ts
│
├── shared/                            ← BOTH READ; PERSON 1 GENERATES TYPES
│   ├── contracts/
│   │   ├── api.schema.json            # (Person 2 owns source of truth)
│   │   └── api.types.ts               # (Person 1 generates from schema)
│   └── constants/
│       └── index.ts                   # (Both agree; Person 1 writes TS version)
│
└── .github/
    └── workflows/
        └── frontend.yml               # CI: type-check, lint, test, build
```

---

## 4. Phase-Wise AI Execution Prompts

> **INSTRUCTION:** Paste each phase prompt into a NEW Cursor chat (Composer mode, Agent context).  
> **RULE:** Do NOT proceed to Phase N+1 until Phase N passes its Acceptance Criteria.  
> **CONTEXT:** Each prompt assumes all previous phases are complete and committed to git.

---

### PHASE 0 — Environment & Tooling Scaffold
**Estimated Time:** 45 minutes  
**Goal:** Initialize project, install all dependencies, configure strict TypeScript, verify dev server runs.

```text
You are initializing the RaktaSetu NOOR frontend — a clinical AI platform for Thalassemia blood management. This is Phase 0 of 6.

OBJECTIVE:
Create the entire Next.js 14 project scaffold with strict TypeScript, Tailwind CSS, shadcn/ui, and all runtime dependencies. The output must be production-grade from the first commit.

STEP 1 — PROJECT INITIALIZATION:
Run the following exact command in the /frontend directory:
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm

After creation, modify tsconfig.json to enforce STRICT mode:
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "forceConsistentCasingInFileNames": true

STEP 2 — SHADCN/UI INIT:
Run: npx shadcn@latest init --yes --template next --base-color slate
Then install these exact components:
  npx shadcn@latest add button card badge alert dialog sheet skeleton tabs table input label select toast

STEP 3 — DEPENDENCY INSTALLATION:
Install these exact packages with npm:
  npm install zustand@4.5 @tanstack/react-query@5 axios@1.7 react-hook-form@7.51 zod@3.23 @hookform/resolvers@3.4 recharts@2.12 leaflet@1.9 react-leaflet@4.2 @types/leaflet@1.9 date-fns@3.6 clsx@2.1 tailwind-merge@2.3 lucide-react@0.378 @supabase/supabase-js@2.43 @supabase/ssr@0.3

Dev dependencies:
  npm install -D vitest@1.6 @testing-library/react@15 @testing-library/jest-dom@6.4 jsdom@24 @vitejs/plugin-react@4 msw@2.3

STEP 4 — FILE CREATION:
Create the following files with exact content:

A) /frontend/lib/utils/cn.ts:
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

B) /frontend/.env.local.example:
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_NAME="RaktaSetu NOOR"

C) /frontend/vitest.config.ts:
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "./") } },
});

D) /frontend/tests/setup.ts:
import "@testing-library/jest-dom";

E) /frontend/next.config.ts:
import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true, images: { remotePatterns: [] } };
export default nextConfig;

F) /frontend/app/layout.tsx:
Root layout with Inter font, Tailwind imports, and a minimal html/body structure.

G) /frontend/app/page.tsx:
Redirect component that immediately pushes to /dashboard via next/navigation useRouter.

H) /frontend/app/dashboard/layout.tsx:
A shell layout with a placeholder sidebar and main content area using flexbox.

I) /frontend/app/dashboard/page.tsx:
A placeholder page showing "Patient Overview — Coming in Phase 1".

STEP 5 — VERIFICATION:
Run npm run dev and confirm the server starts on http://localhost:3000 with zero TypeScript errors.
Run npm run lint and confirm zero ESLint errors.

ACCEPTANCE CRITERIA:
- [ ] `npm run dev` serves on :3000 without errors
- [ ] `npx tsc --noEmit` passes with zero type errors
- [ ] All shadcn/ui components render in a test page at /test-ui
- [ ] .env.local.example is committed to git
- [ ] Branch: feat/p1-phase0-scaffold
```

---

### PHASE 1 — Design System, Shared Components & Layout Shell
**Estimated Time:** 60 minutes  
**Goal:** Build the reusable component layer and dashboard navigation shell. All subsequent phases depend on this.

```text
You are building Phase 1 of 6 for RaktaSetu NOOR frontend. Phase 0 (scaffold) is complete.

OBJECTIVE:
Build the shared design system, layout shell, and reusable components that all domain views will consume. Follow these ABSOLUTE RULES:
1. Every interactive element has an aria-label.
2. Color is NEVER the only status indicator — always pair with icon + text.
3. All components use named exports (no default exports except Next.js pages).
4. All className composition uses cn() from @/lib/utils/cn.ts.
5. All dates use date-fns format/parse functions. Never use raw Date arithmetic.

COMPONENTS TO BUILD (in order):

1. /frontend/components/shared/StatusPill.tsx
Props interface:
  type Status = "green" | "amber" | "red" | "blue" | "gray";
  interface StatusPillProps { status: Status; label: string; icon?: React.ReactNode; onClick?: () => void; }
Behavior: Renders a rounded-full badge with left icon. Green=#22c55e, Amber=#f59e0b, Red=#ef4444, Blue=#3b82f6, Gray=#6b7280. If onClick provided, add hover:opacity-80 cursor-pointer.

2. /frontend/components/shared/AlertBanner.tsx
Props: { variant: "info" | "warning" | "error"; title: string; message?: string; actionLabel?: string; onAction?: () => void; }
Behavior: Full-width alert with Lucide icon (Info/AlertTriangle/AlertOctagon). Action button on right. Must be dismissible with local state.

3. /frontend/components/shared/LoadingSkeleton.tsx
Props: { variant: "card" | "chart" | "table" | "text"; lines?: number; }
Behavior: Composes shadcn Skeleton primitives. "chart" variant renders a rectangle 320px high. "card" renders a Card with Skeleton header + 3 Skeleton rows.

4. /frontend/components/shared/ErrorBoundary.tsx
A class component wrapping React.Component with componentDidCatch. Renders a centered card with "Something went wrong" + reload button when triggered. Log error to console.

5. /frontend/components/shared/PageHeader.tsx
Props: { title: string; subtitle?: string; action?: { label: string; onClick: () => void; icon?: React.ReactNode } }
Behavior: Flex row with title (text-2xl font-bold) + subtitle (text-muted-foreground) on left, action button on right.

6. /frontend/components/shared/EmptyState.tsx
Props: { title: string; description: string; action?: { label: string; onClick: () => void } }
Behavior: Centered flex column with an SVG placeholder (use a generic heart/pulse SVG inline), text, and optional primary button.

7. /frontend/components/layout/Sidebar.tsx
Behavior: Collapsible sidebar rail (w-64 expanded, w-16 collapsed). Navigation items:
  - Dashboard (/dashboard)
  - Patients (/dashboard) — active when viewing any patient
  - RaktaGrid (/dashboard/grid)
Use Lucide icons: LayoutDashboard, Users, Map. Highlight active route with bg-accent. Collapse toggle at bottom.

8. /frontend/components/layout/TopNav.tsx
Behavior: Fixed top bar (h-16). Left: hamburger menu (mobile only). Center: search input (placeholder "Search patients..."). Right: notification bell + user avatar dropdown.

9. /frontend/components/layout/MobileNav.tsx
Behavior: Bottom sheet / bottom nav bar visible only below 768px. Uses same routes as Sidebar.

10. /frontend/app/dashboard/layout.tsx (UPDATE)
Compose Sidebar + TopNav + MobileNav around children. Use flex h-screen overflow-hidden. Main content area should scroll independently.

11. /frontend/lib/utils/dates.ts
Export: formatDate(date: string | Date, formatStr?: string) => string; parseDate(str: string) => Date; daysBetween(a: string, b: string) => number. All wrappers around date-fns.

12. /frontend/lib/utils/blood-types.ts
Export: formatBloodGroup(type: BloodType, rh: RhFactor) => string (e.g. "B+"); getCompatibilityMatrix() => Record<string, string[]>; isCompatible(donor: string, recipient: string) => boolean.

13. /frontend/lib/utils/format.ts
Export: formatHb(value: number) => string (e.g. "8.2 g/dL"); formatConfidence(value: number) => string (e.g. "89%").

ACCEPTANCE CRITERIA:
- [ ] All 13 files compile with zero TypeScript errors
- [ ] Dashboard layout renders correctly on desktop (1440px) and mobile (375px)
- [ ] Sidebar active state changes on navigation
- [ ] StatusPill renders all 5 color variants with icons
- [ ] EmptyState renders with SVG and action button
- [ ] Commit to branch: feat/p1-phase1-design-system
```

---

### PHASE 2 — API Client, React Query Layer & MSW Mock Infrastructure
**Estimated Time:** 75 minutes  
**Goal:** Build the complete data layer so Person 1 can develop all UI independently while Person 2 builds the backend.

```text
You are building Phase 2 of 6 for RaktaSetu NOOR frontend. Phases 0-1 are complete.

OBJECTIVE:
Build the typed API client, React Query hooks, and MSW mock infrastructure. This is the FOUNDATION of all data fetching. Every API call must be typed and every hook must handle loading/error states properly.

RULES:
1. ALL API calls go through lib/api/*.ts modules. Never call axios directly from components.
2. React Query ONLY for server state. No useEffect + fetch patterns anywhere.
3. Query keys are defined as constants in lib/constants.ts.
4. MSW mocks must match the shared API contracts EXACTLY.
5. All mock data must support the demo narrative (Priya, Vikram, Suresh, Apollo Bank).

STEP 1 — SHARED CONSTANTS & TYPES:
Create /frontend/lib/constants.ts with:
  export const QUERY_KEYS = { patients: ["patients"] as const, patient: (id: string) => ["patient", id] as const, forecast: (id: string) => ["forecast", id] as const, guardianCircle: (id: string) => ["guardian-circle", id] as const, cityInventory: (code: string) => ["city-inventory", code] as const, };
  export const DEMO = { PRIYA_ID: "550e8400-e29b-41d4-a716-446655440001", VIKRAM_ID: "550e8400-e29b-41d4-a716-446655440002", CITY_CODE: "HYD", BANK_APOLLO_ID: "550e8400-e29b-41d4-a716-446655440010", BANK_YASHODA_ID: "550e8400-e29b-41d4-a716-446655440011", GUARDIAN_RAJU_ID: "550e8400-e29b-41d4-a716-446655440020", GUARDIAN_SURESH_ID: "550e8400-e29b-41d4-a716-446655440021", };

Create /shared/constants/index.ts with:
  export const HB_TRANSFUSION_THRESHOLD = 7.0;
  export const HB_THRESHOLD_PEDIATRIC = 7.5;
  export const FERRITIN_OVERLOAD_THRESHOLD = 2500;
  export const GUARDIAN_CIRCLE_SIZE = 8;
  export const GUARDIAN_PRIMARY_COUNT = 3;
  export const GUARDIAN_SECONDARY_COUNT = 3;
  export const GUARDIAN_RARE_COUNT = 2;
  export const MOBILIZATION_DAYS = [10, 7, 3, 0] as const;
  export const FORECAST_HORIZON_DAYS = 60;
  export const INVENTORY_STALE_HOURS = 24;
  export const BLOOD_TYPES = ["A", "B", "AB", "O"] as const;
  export const RH_FACTORS = ["+", "-"] as const;
  export const ALERT_SEVERITY_COLORS = { info: "blue", warning: "amber", critical: "red" } as const;
  export const HEALTH_STATUS_COLORS = { green: "#22c55e", yellow: "#f59e0b", red: "#ef4444" } as const;
  export const GUARDIAN_STATUS_COLORS = { active: "green", cooldown: "amber", pending: "blue", unavailable: "red", empty: "gray" } as const;
  export const SUPPORTED_LANGUAGES = [ { code: "te", label: "Telugu" }, { code: "hi", label: "Hindi" }, { code: "mr", label: "Marathi" }, { code: "ta", label: "Tamil" }, { code: "kn", label: "Kannada" }, { code: "ml", label: "Malayalam" }, { code: "gu", label: "Gujarati" }, { code: "bn", label: "Bengali" }, { code: "or", label: "Odia" }, { code: "en", label: "English" }, ] as const;

STEP 2 — API TYPES (from shared contracts):
Create /shared/contracts/api.types.ts with COMPLETE interfaces for:
  ApiResponse<T>, ApiError, ResponseMeta, Patient, HbReading, ForecastResult, ForecastPoint, ForecastStatus, AlertFlag, AlertType, AlertSeverity, GuardianCircle, Guardian, GuardianRole, GuardianStatus, MobilizationStatus, CityInventory, BloodBankNode, InventoryMatch, TypeCoverage, HealthStatus, MatchUrgency, MatchStatus, BloodType, RhFactor, BloodGroup, HbReadingInput, PatientCreate.
Every field must be typed. Use string for ISO dates, number for scores, boolean for flags. Use literal unions where specified.

STEP 3 — API CLIENT:
Create /frontend/lib/api/client.ts:
  import axios from "axios";
  export const apiClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000", timeout: 10000, headers: { "Content-Type": "application/json" }, });
  // Request interceptor: attach Supabase JWT from cookie/localStorage
  // Response interceptor: standardize error handling, log request_id if present

STEP 4 — API MODULES:
Create typed API functions in:
  /frontend/lib/api/patients.ts — getPatients(), getPatient(id), createPatient(data)
  /frontend/lib/api/forecasts.ts — getForecast(patientId)
  /frontend/lib/api/guardians.ts — getGuardianCircle(patientId), mobilizeCircle(patientId)
  /frontend/lib/api/grid.ts — getCityInventory(cityCode), approveMatch(matchId)
  /frontend/lib/api/alerts.ts — getAlerts(patientId)

Each function returns Promise<ApiResponse<T>> and uses apiClient.

STEP 5 — REACT QUERY HOOKS:
Create hooks in /frontend/lib/hooks/:
  usePatients() — useQuery({ queryKey: QUERY_KEYS.patients, queryFn: getPatients })
  usePatient(id) — useQuery({ queryKey: QUERY_KEYS.patient(id), queryFn: () => getPatient(id) })
  useForecast(id) — useQuery({ queryKey: QUERY_KEYS.forecast(id), queryFn: () => getForecast(id), staleTime: 5 * 60 * 1000, refetchInterval: 30 * 1000 }) // 30s polling for demo
  useGuardianCircle(id) — similar, staleTime 1m, refetchInterval 30s
  useCityInventory(code) — similar, staleTime 5m
  useLogHbReading() — useMutation({ mutationFn: logHbReading, onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: QUERY_KEYS.forecast(vars.patientId) }) } })
  useApproveMatch() — useMutation({ mutationFn: approveMatch, onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cityInventory(DEMO.CITY_CODE) }) })

STEP 6 — MSW MOCK INFRASTRUCTURE:
Create /frontend/lib/mocks/fixtures.ts with EXACT demo data:
  - Patient "Priya" (B+, age 9, current Hb 7.2, next transfusion predicted 2024-11-03)
  - Patient "Vikram" (B+, Kell-negative, alloimmunization_flag: true, current Hb 6.8)
  - 14-month Hb history for Priya: sawtooth pattern starting from ~10.5 g/dL post-transfusion, decaying to ~6.8 g/dL over ~21 days, then spike back up. Repeat 20+ cycles with slight variance (±0.3 g/dL). Include seasonal dips (e.g., lower readings in monsoon months).
  - Forecast points: Prophet-style projection from last reading (7.2 on Oct 20) down to threshold 7.0 on Nov 3 with confidence band ±2 days.
  - Guardian circle for Priya: 8 guardians with statuses: Raju (cooldown, last donation 40 days ago), Suresh (pending — THE DEMO HOOK), Anita (active), Mani (active), Preet (active), Kavya (active), Ravi (active), Divya (active).
  - City inventory for HYD: 5 blood banks (Apollo, Yashoda, KIMS, Care, Rainbow) with lat/lng in Hyderabad. Apollo has 2 B+ Kell-negative units expiring 2024-11-05. Yashoda has adequate stock. Others mixed.
  - Inventory match for Vikram: 2 units at Apollo, expiring Nov 5, distance 4km, urgency "urgent", status "pending".

Create /frontend/lib/mocks/handlers.ts using MSW v2 syntax (http.get, http.post, etc.) that returns HttpResponse.json({ success: true, data: ... }) for all API routes.

Create /frontend/lib/mocks/browser.ts that conditionally initializes MSW only in development AND when NEXT_PUBLIC_API_URL includes "localhost".

STEP 7 — ZUSTAND STORE:
Create /frontend/lib/store/app-store.ts:
  interface AppState { sidebarOpen: boolean; selectedPatientId: string | null; activeView: "noor" | "guardian" | "grid"; toggleSidebar: () => void; setPatient: (id: string | null) => void; setView: (v: AppState["activeView"]) => void; }
  export const useAppStore = create<AppState>((set) => ({ ... }));

ACCEPTANCE CRITERIA:
- [ ] All API types compile with zero errors (run npx tsc --noEmit)
- [ ] MSW intercepts all API calls in dev mode; real API calls bypass MSW when NEXT_PUBLIC_API_URL is production
- [ ] React Query devtools (install @tanstack/react-query-devtools) show query cache correctly
- [ ] useForecast hook returns Priya's mock data with 14-month sawtooth history
- [ ] useGuardianCircle returns 8 guardians with Raju=cooldown, Suresh=pending
- [ ] useCityInventory returns 5 Hyderabad blood banks with Apollo having Kell-negative units
- [ ] Zustand store persists sidebar state across navigation
- [ ] Commit to branch: feat/p1-phase2-data-layer
```

---

### PHASE 3 — NOOR Engine Dashboard (The Clinical Brain UI)
**Estimated Time:** 90 minutes  
**Goal:** Build the Hb forecast chart, clinical alerts, and patient header. This is the PRIMARY visual anchor of the entire demo.

```text
You are building Phase 3 of 6 for RaktaSetu NOOR frontend. Phases 0-2 are complete. The data layer is ready.

OBJECTIVE:
Build the NOOR Engine patient dashboard — the single most important view in the hackathon. The HbForecastChart must be visually stunning and medically credible. The ClinicalAlerts must tell the story of Priya's health at a glance.

DEMO NARRATIVE CONTEXT:
- Priya is 9 years old, B+ blood type.
- Her Hb history shows a sawtooth: post-transfusion spikes (~10.5 g/dL), then gradual decay to ~6.8 g/dL over 21 days.
- Today is October 20th. Her current Hb is 7.2 g/dL.
- NOOR predicts she will cross the 7.0 threshold on November 3rd (±2 days, 89% confidence).
- Three alerts: Guardian circle active (green), Iron overload trending (amber), Alloimmunization clear (green).

COMPONENTS TO BUILD:

1. /frontend/components/noor/PatientHeader.tsx
Props: { patient: Patient; currentHb: number | null; nextTransfusion: string | null; }
Layout: Left side — patient name (text-3xl font-bold), blood type badge (B+ in a colored pill), age. Right side — big metric cards: "Current Hb" (7.2 g/dL), "Next Transfusion" ("Nov 3rd"), "Confidence" ("89%"). Use the actual StatusPill component for blood type.

2. /frontend/components/noor/HbForecastChart.tsx (THE CHART)
Props: { historical: HbReading[]; forecast: ForecastPoint[]; threshold: number; predictedDate: string; }
Requirements:
  - Use Recharts ComposedChart with ResponsiveContainer (width=100%, height=320).
  - X-axis: dates (format "MMM dd"). Y-axis: Hb value (domain [5, 12]).
  - Historical line: solid stroke #2563eb (blue), strokeWidth 2, dot={false} (too many points).
  - Forecast line: dashed stroke #3b82f6, strokeWidth 2, strokeDasharray="6 4".
  - Confidence band: Area between ci_lower and ci_upper, fill #93c5fd, opacity 0.3.
  - Threshold line: ReferenceLine y={7.0}, stroke #ef4444, strokeDasharray="3 3", label="Transfusion Threshold".
  - Predicted crossing: Custom dot or annotation at the intersection of forecast line and threshold. Show a label "Nov 3rd" with a small flag.
  - Tooltip: Custom tooltip showing date, Hb value, and whether reading is "Actual" or "Predicted". If predicted, show confidence interval.
  - Legend: "Historical Hb", "Forecast", "Confidence Band", "Threshold".
  - On click of any forecast point: open a small inline explanation (or Sheet) saying "NOOR predicts Hb will reach 7.0 g/dL around this date based on Priya's personal decay curve."
  - CRITICAL: The sawtooth must look realistic. Use the fixture data from Phase 2. If fixture data is insufficient, generate 24 cycles of synthetic data with variance.

3. /frontend/components/noor/ForecastSummary.tsx
Props: { predictedDate: string; confidenceLower: string; confidenceUpper: string; confidencePct: number; }
Layout: A prominent banner card with a calendar icon. Big text: "Transfusion predicted for November 3rd". Subtext: "89% confidence · Window: Nov 1 – Nov 5". Use a gentle pulse animation on the border (CSS keyframe) to draw attention.

4. /frontend/components/noor/ClinicalAlerts.tsx
Props: { alerts: AlertFlag[]; }
Layout: Horizontal row on desktop, vertical stack on mobile. Three pills:
  - Guardian Circle: green pill, icon Users, text "Active — 7 confirmed"
  - Iron Overload: amber pill, icon AlertTriangle, text "Ferritin trending — doctor notified"
  - Alloimmunization: green pill, icon ShieldCheck, text "No anomaly detected"
Each pill is clickable. On click, expand a detail panel below (use framer-motion or CSS transition) showing:
  - The full alert message
  - Recommended action
  - Detected at timestamp
  - A "Mark as read" or "View details" button

5. /frontend/components/noor/TransfusionTimeline.tsx
Props: { readings: HbReading[]; }
Layout: Vertical timeline showing last 6 transfusion cycles. Each cycle: date, pre-transfusion Hb, post-transfusion Hb, units transfused, Hb rise per unit. Use a connecting line between nodes. Highlight any cycle where Hb rise per unit dropped significantly (alloimmunization signal).

6. /frontend/components/noor/HbReadingForm.tsx
Props: { patientId: string; onSuccess?: () => void; }
Layout: Dialog/sheet trigger button "Log Hb Reading". Form fields:
  - Hb value: number input (step 0.1, min 0, max 20), label "Hb Value (g/dL)"
  - Reading date: date picker (default today)
  - Post-transfusion: checkbox. If checked, show "Units transfused" number input (1-10)
  - Submit button: "Save Reading"
Validation: Zod schema matching backend contract. On submit, call useLogHbReading mutation. Show toast on success/error.

7. /frontend/app/dashboard/patient/[id]/page.tsx (NOOR DEFAULT VIEW)
Compose PatientHeader + ForecastSummary + HbForecastChart + ClinicalAlerts + TransfusionTimeline + HbReadingForm floating action button. Use React Query hooks from Phase 2. Wrap each section in ErrorBoundary + Suspense with LoadingSkeleton.

ACCEPTANCE CRITERIA:
- [ ] HbForecastChart renders sawtooth pattern with 14+ months of data
- [ ] Forecast dashed line crosses threshold at Nov 3rd with confidence band
- [ ] Chart is responsive (test at 375px, 768px, 1440px)
- [ ] ClinicalAlerts expand/collapse smoothly
- [ ] HbReadingForm validates inputs and calls mutation
- [ ] Page loads with simulated 200ms delay showing LoadingSkeleton
- [ ] Zero console warnings or errors
- [ ] Lighthouse LCP < 2.0s on patient page (test with npm run build + npx serve)
- [ ] Commit to branch: feat/p1-phase3-noor-dashboard
```

---

### PHASE 4 — Guardian Constellation (The Emotional Hook)
**Estimated Time:** 90 minutes  
**Goal:** Build the SVG star map, node animations, and mobilization UI. This is where judges feel something.

```text
You are building Phase 4 of 6 for RaktaSetu NOOR frontend. Phases 0-3 are complete.

OBJECTIVE:
Build the Guardian Constellation — an SVG-based visualization that turns a donor management interface into an emotional experience. When Suresh confirms, his star must light up with a glow pulse. This is THE hackathon moment.

DEMO NARRATIVE CONTEXT:
- Priya has 8 guardians arranged in a circle.
- Raju is in cooldown (dimmed star, 40 days since last donation).
- Suresh is pending (pulsing animation — he was messaged 4 days ago, replied this morning).
- The other 6 are active (bright stars).
- During the demo, Suresh's star transitions from pulsing to bright with a glow effect.

COMPONENTS TO BUILD:

1. /frontend/components/guardian/GuardianConstellation.tsx (THE CONSTELLATION)
Props: { patientName: string; guardians: Guardian[]; onNodeClick?: (g: Guardian) => void; }
Requirements:
  - SVG-based, NOT a chart library. ViewBox="0 0 600 600".
  - Center: patient name "Priya" in a warm glow circle (radial gradient, soft gold).
  - 8 guardian nodes arranged in a perfect circle (radius 220px) around center.
  - Node positions calculated with trig: x = 300 + 220*cos(angle), y = 300 + 220*sin(angle), where angle = (index * 2π / 8) - π/2 (start at top).
  - Each node is a group <g> containing:
    - Outer ring: circle r=28, stroke varies by status
    - Inner star: SVG polygon (5-point star) or circle with icon
    - Label: guardian name below node, text-anchor="middle"
    - Status dot: small circle at bottom-right of node indicating status color
  - Node states:
    - active: fill #fbbf24 (amber-400), stroke #f59e0b, filter="url(#glow)" (SVG filter with feGaussianBlur)
    - cooldown: fill #9ca3af (gray-400), stroke #6b7280, opacity 0.6
    - pending: fill #60a5fa (blue-400), stroke #3b82f6, with CSS animation pulse (scale 1.0 ↔ 1.15, opacity 0.8 ↔ 1.0, 2s infinite)
    - unavailable: fill #ef4444 (red-500), stroke #b91c1c
    - empty: fill transparent, stroke #d1d5db, dashed stroke
  - Connecting lines: subtle lines from center to each active/pending node (opacity 0.3, stroke #fbbf24). No line to empty nodes.
  - Glow filter definition in SVG <defs>: feGaussianBlur stdDeviation="3" result="coloredBlur", then merge with source graphic.
  - DEMO TRANSITION: When Suresh's status changes from "pending" to "active" (detected via React Query polling or prop change), trigger a celebratory animation:
    - Star scales up to 1.4 with spring physics (use CSS transition or framer-motion if installed)
    - Glow intensifies (increase feGaussianBlur stdDeviation to 6 temporarily)
    - A ripple ring expands outward from the node and fades (SVG circle with animated r and opacity)
    - Text "Suresh confirmed!" appears briefly above the node
  - Hover interaction: on mouseenter, show a tooltip/card near the node with:
    - Guardian name, role (Primary/Secondary/Rare Specialist)
    - Last donation date
    - Next eligible date
    - Donation count
    - Response latency
  - Mobile: on touch, show the same info in a bottom sheet (use shadcn Sheet component).

2. /frontend/components/guardian/GuardianNode.tsx
Extract the individual node rendering logic from Constellation for testability. Must accept status, name, role, and animation trigger as props.

3. /frontend/components/guardian/GuardianCard.tsx
Props: { guardian: Guardian; patientName: string; open: boolean; onClose: () => void; }
Layout: shadcn Sheet (slide from right on desktop, slide from bottom on mobile). Content:
  - Header: Guardian name + role badge
  - Stats grid: Last donation, Next eligible, Total donations, Avg response time
  - Action buttons: "Message" (opens WhatsApp web link), "View History", "Replace Guardian" (disabled for demo)
  - If status is pending: show "Awaiting confirmation..." with a spinner

4. /frontend/components/guardian/CircleHealthBar.tsx
Props: { coverage: number; engagement: number; resilience: number; }
Layout: Three horizontal progress bars (or radial gauges if you're ambitious) labeled:
  - Coverage: "8/8 guardians active" → 100%
  - Engagement: "Avg response 4.2 hours" → 94%
  - Resilience: "Survives 2 simultaneous absences" → 87%
Use color coding: green >80, amber 50-80, red <50.

5. /frontend/components/guardian/MobilizationStatus.tsx
Props: { status: MobilizationStatus; daysToTransfusion: number | null; }
Layout: A prominent countdown banner.
  - If daysToTransfusion > 10: "T-{days} · Guardian circle on standby"
  - If 7-10: "T-{days} · Soft ask sent to primary guardians"
  - If 3-7: "T-{days} · Confirmations in progress — 6 of 8 confirmed"
  - If 0-3: "T-{days} · Final logistics — transfusion scheduled"
  - If status === "confirmed": "All guardians confirmed · Transfusion ready"
  - If status === "failed": "Circle compromised · RaktaGrid activated" (red banner)
Use a circular progress indicator or stepper showing T-14, T-10, T-7, T-3, T-0.

6. /frontend/app/dashboard/patient/[id]/guardian/page.tsx
Compose GuardianConstellation (center stage) + CircleHealthBar (top) + MobilizationStatus (top) + GuardianCard (triggered by node click). Use useGuardianCircle hook with 30-second polling.

ACCEPTANCE CRITERIA:
- [ ] Constellation renders 8 nodes in a perfect circle around "Priya"
- [ ] Raju's node is dimmed (cooldown), Suresh's node is pulsing (pending)
- [ ] Hovering a node shows tooltip with guardian details
- [ ] Clicking a node opens GuardianCard sheet
- [ ] Suresh's pending→active transition plays glow + ripple animation (test by manually changing mock data)
- [ ] CircleHealthBar shows three scores with color-coded bars
- [ ] MobilizationStatus shows correct T-minus copy
- [ ] Mobile: constellation scales to fit 375px width without overlap
- [ ] Commit to branch: feat/p1-phase4-guardian-constellation
```

---

### PHASE 5 — RaktaGrid City Map & Inventory Intelligence
**Estimated Time:** 75 minutes  
**Goal:** Build the Leaflet map, blood bank markers, match cards, and approval flow.

```text
You are building Phase 5 of 6 for RaktaSetu NOOR frontend. Phases 0-4 are complete.

OBJECTIVE:
Build the RaktaGrid city-level blood inventory view. This demonstrates the third innovation layer — what happens when the guardian circle fails.

DEMO NARRATIVE CONTEXT:
- Switch to patient Vikram (B+, Kell-negative, alloimmunization active).
- His guardian circle is entirely in cooldown.
- The coordinator sees RaktaGrid: a Hyderabad map with 5 blood bank markers.
- Apollo Blood Bank has 2 Kell-negative B+ units expiring Nov 5.
- Vikram needs blood Nov 7.
- Match card: "2 phenotype-compatible units found at Apollo — expiring Nov 5. Recommend transfer. Approve?"
- One tap approves.

COMPONENTS TO BUILD:

1. /frontend/components/grid/CityBloodMap.tsx
Props: { cityCode: string; banks: BloodBankNode[]; matches: InventoryMatch[]; onBankSelect?: (bank: BloodBankNode) => void; onMatchSelect?: (match: InventoryMatch) => void; }
Requirements:
  - Dynamic import of Leaflet to avoid SSR issues:
    import dynamic from "next/dynamic";
    const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
    // Same for TileLayer, Marker, Popup
  - Map centered on Hyderabad [17.3850, 78.4867], zoom 12.
  - Custom marker icons using Leaflet divIcon:
    - green (adequate): rounded div with bg-green-500, white check icon
    - amber (low): rounded div with bg-amber-500, white minus icon
    - red (critical): rounded div with bg-red-500, white alert icon
    - pulsing animation for markers with active matches
  - Marker popup on click: bank name, last sync time, inventory summary (e.g., "A+: 12 units, B+: 3 units").
  - On marker click, also trigger onBankSelect to open sidebar panel.
  - Match indicators: if a match exists for a bank, draw a subtle pulse ring around the marker or add a badge count.

2. /frontend/components/grid/BloodBankPanel.tsx
Props: { bank: BloodBankNode | null; onClose: () => void; }
Layout: Slide-out sidebar (right side, w-96 on desktop, full-width sheet on mobile).
Content if bank selected:
  - Header: bank name + sync status (green dot if <24h, red if stale)
  - Inventory table: blood type | units available | days until expiry | status
  - If bank has matches: show InventoryMatchCard list
  - "Contact Bank" button (mailto: placeholder)

3. /frontend/components/grid/InventoryMatchCard.tsx
Props: { match: InventoryMatch; onApprove?: (id: string) => void; onReject?: (id: string) => void; }
Layout: Card with colored left border (green routine, amber urgent, red critical).
Content:
  - Patient name, blood group, urgency badge
  - Bank name, distance ("4 km away"), expiry countdown ("Expiring in 5 days — Nov 5")
  - Units available
  - Recommended action text
  - Buttons: "Approve Transfer" (primary), "Reject" (ghost), "View Details" (outline)
  - If status === "approved": show green check "Transfer initiated"
  - If status === "rejected": show gray "Rejected"

4. /frontend/components/grid/CityHealthScore.tsx
Props: { score: number; status: HealthStatus; lastOptimized: string; }
Layout: Big banner at top of grid page. Left: circular progress gauge (score / 100). Right: status text ("Green — City blood supply is healthy for the next 14 days" or "Red — Critical shortage in B- and O-"). Use the HEALTH_STATUS_COLORS constant.

5. /frontend/components/grid/MatchApprovalFlow.tsx
Props: { match: InventoryMatch; open: boolean; onClose: () => void; }
Layout: Dialog confirmation. "You are approving a transfer of 2 B+ Kell-negative units from Apollo Blood Bank to Vikram's care team. This will reserve the units for 48 hours." Primary action: "Confirm Approval". On confirm, call useApproveMatch mutation. Show loading state, then success toast.

6. /frontend/app/dashboard/grid/page.tsx
Compose CityHealthScore (top) + two-column layout: CityBloodMap (left, 2/3 width) + BloodBankPanel (right, 1/3 width). On mobile, stack vertically: map first, panel as bottom sheet when bank selected. Use useCityInventory hook.

ACCEPTANCE CRITERIA:
- [ ] Leaflet map loads without SSR hydration errors
- [ ] 5 markers render in Hyderabad with correct colors
- [ ] Apollo marker shows 2 Kell-negative units in popup
- [ ] Clicking Apollo opens BloodBankPanel with inventory table
- [ ] InventoryMatchCard for Vikram shows "Approve Transfer" button
- [ ] Approving match shows success state and updates card
- [ ] CityHealthScore renders circular gauge at 72/100 (green)
- [ ] Mobile: map is full-width, panel becomes bottom sheet
- [ ] Commit to branch: feat/p1-phase5-raktagrid-map
```

---

### PHASE 6 — Auth, Polish, Mobile & Deployment Prep
**Estimated Time:** 60 minutes  
**Goal:** Add Supabase auth UI, final responsive pass, demo-specific polish, and deploy to Vercel.

```text
You are building Phase 6 of 6 for RaktaSetu NOOR frontend. All previous phases are complete.

OBJECTIVE:
Final integration, auth flow, responsive polish, and production deployment. This phase turns a working prototype into a demo-ready product.

TASKS:

1. AUTHENTICATION UI:
Create /frontend/app/(auth)/login/page.tsx:
  - Use @supabase/ssr to create a Supabase client.
  - Render a clean login card with email/password fields.
  - "Sign in as Coordinator" button that bypasses real auth for demo (sets a mock JWT cookie and redirects to /dashboard).
  - Real Supabase auth as fallback.
Create /frontend/app/(auth)/register/page.tsx:
  - Simple onboarding: name, email, hospital name.
  - For demo, this can be a UI mock that redirects to login.

2. AUTH GUARD:
Update /frontend/app/dashboard/layout.tsx:
  - Check for auth token (from cookie/localStorage).
  - If missing, redirect to /login.
  - For demo, allow a "Demo Mode" bypass button.

3. API CLIENT AUTH:
Update /frontend/lib/api/client.ts:
  - Request interceptor reads Supabase session token and injects Authorization: Bearer <token>.
  - Response interceptor handles 401 by redirecting to /login.

4. DEMO POLISH:
  - Add a "Demo Mode" banner at top of dashboard: "You are viewing demo data · Priya & Vikram · Hyderabad". Dismissible.
  - Pre-load demo state: on first dashboard visit, auto-select Priya and show her NOOR view.
  - Add keyboard shortcuts: "G" key switches to Guardian view, "M" key switches to Grid view, "H" key goes home.
  - Add a "Reset Demo" button in sidebar footer that reloads MSW fixtures to initial state.

5. MOBILE RESPONSIVE PASS:
  - Test every page at 375px, 768px, 1440px.
  - Ensure HbForecastChart doesn't overflow (use ResponsiveContainer correctly).
  - Ensure GuardianConstellation nodes don't overlap on small screens (reduce radius to 140px below 768px).
  - Ensure RaktaGrid map is usable on mobile (touch gestures work, panel doesn't cover entire map).
  - Ensure all text is readable (no text-xs below 12px).

6. PERFORMANCE:
  - npm run build must succeed with zero errors.
  - Add next/image optimization for all static assets.
  - Verify all dynamic imports have loading fallbacks.
  - Add React.memo to HbForecastChart and GuardianConstellation to prevent re-renders.

7. ENVIRONMENT CONFIG:
Create /frontend/.env.production:
  NEXT_PUBLIC_API_URL=https://raktasetu-api.railway.app
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...

8. DEPLOYMENT:
  - Install Vercel CLI: npm i -g vercel
  - Run vercel --prod (or push to main if GitHub integration is set up).
  - Verify production URL loads.
  - Verify all three views (NOOR, Guardian, Grid) work on production.

ACCEPTANCE CRITERIA:
- [ ] Login page renders with "Demo Mode" bypass
- [ ] Dashboard requires auth (or demo bypass)
- [ ] All API calls include Authorization header
- [ ] Mobile responsive at 375px, 768px, 1440px
- [ ] npm run build succeeds
- [ ] Vercel production URL serves the app
- [ ] Demo data loads correctly on production
- [ ] No console errors in production build
- [ ] Lighthouse score ≥ 90 (Performance + Accessibility)
- [ ] Commit to branch: feat/p1-phase6-deployment
- [ ] Merge all p1 branches to dev/person1-frontend, then PR to main
```

---

## 5. API Contracts (Consumed by Person 1)

> **Prefix:** `/api/v1`  
> **Envelope:** All responses follow `ApiResponse<T>`  
> **Auth:** `Authorization: Bearer <supabase_access_token>`

### GET /patients
```typescript
// Response: ApiResponse<PatientListResponse>
interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
}

interface Patient {
  id: string;                    // UUID
  name: string;
  age: number;
  blood_type: "A" | "B" | "AB" | "O";
  rh_factor: "+" | "-";
  kell_negative: boolean;
  duffy_negative: boolean;
  kidd_negative: boolean;
  alloimmunization_flag: boolean;
  hospital_id: string;
  enrolled_at: string;           // ISO datetime
  next_transfusion_predicted: string | null; // ISO date
  hb_current: number | null;     // g/dL
}
```

### GET /patients/:id/forecast
```typescript
// Response: ApiResponse<ForecastResponse>
interface ForecastResponse {
  patient_id: string;
  historical_readings: HbReading[];
  forecast_points: ForecastPoint[];
  predicted_transfusion_date: string;    // ISO date
  confidence_lower: string;              // ISO date
  confidence_upper: string;              // ISO date
  confidence_pct: number;                // 0-100
  alert_flags: AlertFlag[];
  model_version: string;
  generated_at: string;                  // ISO datetime
  status: "success" | "insufficient_data" | "model_error" | "cached";
}

interface HbReading {
  id: string;
  patient_id: string;
  hb_value: number;              // g/dL
  reading_date: string;          // ISO date
  post_transfusion: boolean;
  units_transfused: number | null;
  hb_rise_per_unit: number | null;  // computed
}

interface ForecastPoint {
  date: string;                  // ISO date
  hb_predicted: number;           // g/dL
  ci_lower: number;
  ci_upper: number;
}

interface AlertFlag {
  type: "iron_overload" | "alloimmunization" | "rapid_decline" | "circle_degraded" | "inventory_shortage";
  severity: "info" | "warning" | "critical";
  message: string;
  recommended_action: string;
  detected_at: string;           // ISO datetime
}
```

### GET /patients/:id/guardian-circle
```typescript
// Response: ApiResponse<GuardianCircleResponse>
interface GuardianCircleResponse {
  patient_id: string;
  coverage_score: number;         // 0-100
  engagement_score: number;     // 0-100
  resilience_score: number;       // 0-100
  mobilization_status: "idle" | "active" | "confirmed" | "failed" | "not_needed";
  days_to_transfusion: number | null;
  guardians: Guardian[];
}

interface Guardian {
  id: string;
  name: string;
  phone_last4: string;           // Masked: "****1234"
  role: "primary" | "secondary" | "rare_specialist";
  status: "active" | "cooldown" | "pending" | "unavailable" | "empty";
  last_donation_date: string | null;
  next_eligible_date: string | null;
  donation_count: number;
  response_latency_avg_hours: number;
  preferred_language: string;     // ISO 639-1, e.g. "te"
}
```

### GET /grid/city/:city_code
```typescript
// Response: ApiResponse<CityInventoryResponse>
interface CityInventoryResponse {
  city_code: string;
  city_health_score: number;      // 0-100
  health_status: "green" | "yellow" | "red";
  last_optimized_at: string;      // ISO datetime
  blood_banks: BloodBankNode[];
  active_matches: InventoryMatch[];
  coverage_by_type: Record<string, TypeCoverage>;
}

interface BloodBankNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "green" | "yellow" | "red";
  inventory_summary: Partial<Record<string, number>>;
  last_sync_at: string;
  is_stale: boolean;
}

interface InventoryMatch {
  id: string;
  patient_id: string;
  patient_name: string;
  bank_id: string;
  bank_name: string;
  blood_group: string;
  extended_phenotype_match: boolean;
  units_available: number;
  expiry_date: string;
  days_until_expiry: number;
  urgency: "routine" | "urgent" | "critical";
  distance_km: number;
  recommended_action: string;
  status: "pending" | "approved" | "rejected" | "completed";
}

interface TypeCoverage {
  units_available: number;
  days_covered: number;
  status: "green" | "yellow" | "red";
}
```

### POST /patients/:id/hb-reading
```typescript
// Request: HbReadingInput
interface HbReadingInput {
  hb_value: number;              // 0.0–20.0 g/dL
  reading_date: string;          // ISO date
  post_transfusion: boolean;
  units_transfused?: number;     // 1–10, required if post_transfusion=true
}
// Response: ApiResponse<HbReading>
```

### POST /grid/matches/:match_id/approve
```typescript
// Response: ApiResponse<InventoryMatch>
```

---

## 6. Integration Instructions

### Shared Types Setup
```bash
# Person 2 updates api.schema.json → Person 1 regenerates types
cd shared/contracts
npx json-schema-to-typescript api.schema.json -o api.types.ts
```

### Mock API for Independent Development
Person 1 develops 100% independently using MSW until Hour 4. The mock handlers in `/frontend/lib/mocks/handlers.ts` must match the API contracts exactly.

### Integration Checkpoint Protocol
| Hour | Checkpoint | Person 1 Action | Person 2 Deliverable |
|------|-----------|-----------------|---------------------|
| 2 | Contracts frozen | MSW mocks committed | `/patients` endpoint live |
| 4 | First integration | Switch MSW→real API for patients + forecast | `/patients/:id/forecast` live |
| 6 | Guardian integration | Remove guardian mocks | `/patients/:id/guardian-circle` live |
| 8 | Grid integration | Remove grid mocks | `/grid/city/:code` live |
| 10 | Full E2E test | Demo flow rehearsal | All endpoints + seed data verified |

### Merge Procedure
```bash
# Person 1 merges to main:
git checkout main
git pull origin main
git merge dev/person1-frontend
# Resolve conflicts in package.json (keep both deps), shared/constants (agree), .env.example (merge)
git push origin main
```

---

## 7. Software Requirements Specification (Person 1)

### Functional Requirements
- **FR-1 (NOOR Dashboard):** Display 14-month Hb sawtooth chart with forecast overlay, 80% confidence band, red threshold line at 7.0 g/dL, predicted crossing annotation. Update every 30s via polling.
- **FR-2 (Clinical Alerts):** Three pills (guardian status, iron overload, alloimmunization). Expandable detail panel on click. Color + icon + text for every status.
- **FR-3 (Guardian Constellation):** 8 nodes in circular SVG. States: active (glow), cooldown (dimmed), pending (pulse), unavailable (red), empty (outline). Hover tooltip. Click opens detail sheet. Confirmation animation (scale + ripple + glow).
- **FR-4 (RaktaGrid Map):** Leaflet city map with blood bank markers. Color-coded by stock status. Click opens inventory sidebar. Match cards with approve/reject. City health score banner.
- **FR-5 (Patient Management):** Log Hb reading form with validation. Transfusion history timeline. Patient list overview.
- **FR-6 (Auth):** Login/register UI. Demo mode bypass. JWT injection into API calls. Route guards.

### Non-Functional Requirements
- **NFR-1 (Performance):** Dashboard LCP < 2.0s. Chart render < 500ms after data. Map tile load < 3s on 4G.
- **NFR-2 (Responsiveness):** Fully functional at 375px. Constellation scales without overlap. Mobile drawer navigation < 768px.
- **NFR-3 (Accessibility):** WCAG 2.1 AA. All charts have text table fallbacks. Keyboard-navigable interactive elements. aria-labels on all buttons.
- **NFR-4 (Browser):** Chrome, Firefox, Safari (last 2 versions). iOS Safari 15+, Chrome Android.
- **NFR-5 (Security):** Anon key only in frontend. No service key exposure. Patient data never logged to console. 8-hour session expiry.

### Edge Cases
- Patient with < 3 Hb readings: onboarding prompt, disabled forecast, "Log your first reading" CTA.
- Guardian circle with 0 members: "Circle not yet formed" empty state with "Build Circle" button.
- City map with no blood banks: "No blood banks registered" empty state.
- API timeout: stale data banner "Last updated X minutes ago" with manual refresh.
- Alloimmunization + no phenotype match: critical alert with "Contact specialized center" instructions.
- SSR hydration mismatch on Leaflet: dynamic import with `ssr: false` and loading skeleton.

### Performance Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP | < 2.0s | Lighthouse |
| FID | < 100ms | Lighthouse |
| CLS | < 0.1 | Lighthouse |
| Lighthouse Score | ≥ 90 | Overall |
| API Calls / Page | ≤ 3 | Network tab |
| Chart Render | < 500ms | React Profiler |

---

## 8. Git Workflow & Commit Standards

### Branch Strategy
```
main (protected)
└── dev/person1-frontend
    ├── feat/p1-phase0-scaffold
    ├── feat/p1-phase1-design-system
    ├── feat/p1-phase2-data-layer
    ├── feat/p1-phase3-noor-dashboard
    ├── feat/p1-phase4-guardian-constellation
    ├── feat/p1-phase5-raktagrid-map
    └── feat/p1-phase6-deployment
```

### Commit Format
```
feat(noor): add Hb forecast chart with confidence bands
feat(guardian): implement constellation star animation with glow filter
fix(grid): resolve leaflet SSR hydration error via dynamic import
chore(deps): upgrade recharts to 2.12
docs(readme): add frontend setup instructions
```

### PR Requirements
- PR description: What changed, Why, How to test
- No PR > 400 lines unless structural refactor
- One reviewer approval required (Person 2 for shared files, self for frontend-only)
- CI must pass (type-check, lint, test, build)

---

*End of Person 1 Implementation Package. Execute phases sequentially. Do not skip.*
